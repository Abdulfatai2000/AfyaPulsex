import { AsyncLocalStorage } from "node:async_hooks";
import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

// Explicit opt-in integration test. Creates and removes a uniquely named TEST database only.
// Never writes fixtures, approved Officer accounts or published alerts to the application database.
config({ path: ".env.local", quiet: true });
if (process.env.ALERT_PIPELINE_TEST !== "1")
  throw new Error(
    "Set ALERT_PIPELINE_TEST=1 to run the isolated DB/Groq test.",
  );
const originalUri = process.env.MONGODB_URI;
if (!originalUri) throw new Error("MONGODB_URI is required.");
const dbName = `afyapulse_alert_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const uri = new URL(originalUri);
uri.pathname = `/${dbName}`;
process.env.MONGODB_URI = uri.toString();
process.env.AUTH_URL = "http://localhost:3000";
process.env.AUTH_SECRET ||= randomUUID() + randomUUID();
// Test fixtures only; these do not change .env.local or approve production privacy policy.
process.env.COMMUNITY_CONSENT_VERSION = "isolated-test-policy";
process.env.MIN_AGGREGATE_GROUP_SIZE = "3";
globalThis.AsyncLocalStorage = AsyncLocalStorage;
// Node is the server here; use the package's empty server marker without selecting
// React's RSC-only runtime (Next's request helpers use the normal React runtime).
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return {
        url: new URL("../node_modules/server-only/empty.js", import.meta.url)
          .href,
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
const { connectDB, closeDB } = await import("../server/db/connection.ts");
const models = await import("../server/models/index.ts");
const { computeSignals, aggregateWindow } =
  await import("../server/services/signals.ts");
const { evaluateSignals } = await import("../server/services/warnings.ts");
const ai = await import("../server/services/ai-insights.ts");
const { publishedCitizenFeed } =
  await import("../server/services/public-alerts.ts");
let checks = 0;
function pass(label) {
  checks++;
  console.log(`PASS: ${label}`);
}
try {
  await connectDB();
  assert.equal(mongoose.connection.name, dbName);
  const state = await models.Jurisdiction.create({
    name: "Osun",
    code: "TEST-OS",
    level: "state",
  });
  const lga = await models.Jurisdiction.create({
    name: "Ife Central",
    code: "TEST-IFC",
    level: "lga",
    parent: state._id,
  });
  const outsiders = await models.Jurisdiction.create({
    name: "Outside test scope",
    code: "TEST-OUT",
    level: "state",
  });
  const organization = await models.Organization.create({
    name: "Isolated Test Health Authority",
    type: "ministry",
    jurisdiction: state._id,
  });
  const password = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  const officer = await models.User.create({
    name: "Test Officer",
    email: `${randomUUID()}@example.invalid`,
    passwordHash,
    role: "officer",
  });
  await models.OfficerProfile.create({
    user: officer._id,
    status: "approved",
    jurisdiction: state._id,
    organization: organization._id,
    capabilities: [
      "warnings:read",
      "signals:read",
      "public-alerts:write",
      "public-alerts:publish",
    ],
  });
  const citizens = await models.User.insertMany(
    Array.from({ length: 4 }, (_, i) => ({
      name: `Test Citizen ${i}`,
      email: `${randomUUID()}@example.invalid`,
      passwordHash,
      role: "citizen",
    })),
  );
  await models.CitizenProfile.create({
    user: citizens[0]._id,
    jurisdiction: lga._id,
  });
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  const from = new Date(+to - 7 * 86400000);
  const baselineDate = new Date(+from - 86400000);
  const currentDate = new Date(+to - 86400000);
  await models.ConsentRecord.insertMany(
    citizens.map((citizen) => ({
      citizen: citizen._id,
      purpose: "communityContribution",
      version: "isolated-test-policy",
      granted: true,
      effectiveAt: new Date(+from - 8 * 86400000),
    })),
  );
  const rows = citizens.flatMap((citizen, i) => [
    ...(i < 3
      ? [
          {
            citizen: citizen._id,
            jurisdiction: lga._id,
            reportedAt: baselineDate,
          },
        ]
      : []),
    { citizen: citizen._id, jurisdiction: lga._id, reportedAt: currentDate },
  ]);
  await models.HealthEvent.insertMany(
    rows.map((row) => ({
      ...row,
      symptoms: [
        { name: "PRIVATE free text must never leave DB", severity: 4 },
      ],
      notes: "PRIVATE address and phone must never leave DB",
    })),
  );
  const signals = await computeSignals([String(lga._id)], { from, to });
  assert.equal(signals.length, 1);
  const warnings = await evaluateSignals(signals.map((row) => String(row._id)));
  assert.equal(warnings.length, 1);
  const warningId = String(warnings[0]._id);
  const { payload } = await ai.patternForWarning(warningId, [String(lga._id)]);
  assert.equal(payload.reportCount, 4);
  assert.equal(payload.baselineCount, 3);
  assert.deepEqual(
    Object.keys(payload).sort(),
    [
      "state",
      "lga",
      "periodStart",
      "periodEnd",
      "metric",
      "reportCount",
      "baselineCount",
      "trendSummary",
    ].sort(),
  );
  assert(!JSON.stringify(payload).includes("PRIVATE"));
  pass(
    "real HealthEvents -> consenting, thresholded counts -> detected warning; outbound DTO has no PII/free text",
  );
  await assert.rejects(() =>
    ai.patternForWarning(warningId, [String(outsiders._id)]),
  );
  pass("cross-jurisdiction pattern denied");
  delete process.env.MIN_AGGREGATE_GROUP_SIZE;
  assert.equal(await aggregateWindow(String(lga._id), from, to), null);
  await assert.rejects(
    () => ai.patternForWarning(warningId, [String(lga._id)]),
    /INSUFFICIENT_AGGREGATED_DATA/,
  );
  process.env.MIN_AGGREGATE_GROUP_SIZE = "3";
  pass("missing threshold suppresses aggregate and draft generation");
  const key = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  await assert.rejects(() => ai.generateInsight(payload), /not configured/);
  if (key) process.env.GROQ_API_KEY = key;
  pass("missing API key fails safely");
  for (const invalid of [
    "not JSON",
    '{"title":"x","body":"ok","status":"published"}',
    '{"title":"Confirmed outbreak","body":"Take medication"}',
    '{"title":"Reports","body":"<script>alert(1)</script>"}',
  ])
    assert.throws(() => ai.validateDraft(invalid), /invalid or unsafe/);
  pass("malformed, extra fields, unsafe text and HTML rejected");
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error("test provider failure containing PRIVATE secret");
    };
    await assert.rejects(
      () => ai.generateInsight(payload),
      (error) =>
        error instanceof ai.AlertPipelineError &&
        !error.message.includes("PRIVATE"),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  pass("provider failure returns sanitized useful error");
  // Real Auth.js credentials login; no forged cookies, auth mocks, role bypass or live account changes.
  const { handlers } = await import("../server/auth/config.ts");
  const { NextRequest } = await import("next/server.js");
  async function login(user) {
    const csrfResponse = await handlers.GET(
      new NextRequest("http://localhost:3000/api/auth/csrf"),
    );
    const csrf = await csrfResponse.json();
    const cookie = csrfResponse.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    const response = await handlers.POST(
      new NextRequest("http://localhost:3000/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/x-www-form-urlencoded",
          "X-Auth-Return-Redirect": "1",
        },
        body: new URLSearchParams({
          csrfToken: csrf.csrfToken,
          email: user.email,
          password,
          callbackUrl: "http://localhost:3000/dashboard",
        }),
      }),
    );
    const result = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    assert(result.includes("authjs.session-token"));
    return result;
  }
  const officerCookie = await login(officer);
  const citizenCookie = await login(citizens[0]);
  const { createRequestStoreForAPI } =
    await import("next/dist/server/async-storage/request-store.js");
  const { workUnitAsyncStorage } =
    await import("next/dist/server/app-render/work-unit-async-storage.external.js");
  const { workAsyncStorage } =
    await import("next/dist/server/app-render/work-async-storage.external.js");
  const withSession = (cookie, fn) => {
    const request = new NextRequest(
      "http://localhost:3000/officer/public-alerts",
      {
        headers: {
          cookie,
          host: "localhost:3000",
          "x-forwarded-proto": "http",
        },
      },
    );
    const store = createRequestStoreForAPI(
      request,
      { pathname: "/officer/public-alerts" },
      { tags: [], expirationsByCacheKind: new Map() },
      undefined,
      undefined,
      undefined,
    );
    return workAsyncStorage.run(
      { route: "/officer/public-alerts", isStaticGeneration: false },
      () => workUnitAsyncStorage.run(store, fn),
    );
  };
  const actions = await import("../server/actions/officer/public-alerts.ts");
  const citizenActions = await import("../server/actions/citizen/alerts.ts");
  await assert.rejects(() =>
    withSession(citizenCookie, () =>
      actions.generateAlertDraftAction(warningId),
    ),
  );
  pass("Citizen cannot generate AI drafts");
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            { finish_reason: "stop", message: { content: "malformed JSON" } },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const rejected = await withSession(officerCookie, () =>
      actions.generateAlertDraftAction(warningId),
    );
    assert(!rejected.ok);
    assert.match(rejected.error, /invalid or unsafe/);
    assert.equal(await models.PublicAlert.countDocuments(), 0);
    pass("malformed provider response cannot persist a draft");
  } finally {
    globalThis.fetch = originalFetch;
  }
  let sentPayload;
  try {
    globalThis.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes("api.groq.com")) {
        const body = JSON.parse(init?.body ?? (await input.clone().text()));
        sentPayload = JSON.parse(body.messages[1].content);
        assert.deepEqual(sentPayload, payload);
      }
      return originalFetch(input, init);
    };
    const generated = await withSession(officerCookie, () =>
      actions.generateAlertDraftAction(warningId),
    );
    assert(generated.ok, generated.error);
    assert.deepEqual(sentPayload, payload);
    const draft = await models.PublicAlert.findById(generated.id).lean();
    assert.equal(draft.status, "draft");
    assert(!draft.publishedAt);
    assert.equal((await publishedCitizenFeed([String(lga._id)])).length, 0);
    pass(
      "actual Groq validated draft persisted; captured outbound request has only approved aggregate fields; no automatic publication",
    );
    const copy = {
      id: generated.id,
      revision: draft.updatedAt.toISOString(),
      title: "Reviewed increase in reported activity",
      body: "Reported activity is above the recent baseline. This pattern requires review.",
      level: "watch",
      channels: ["web"],
      audience: "Ife Central residents",
    };
    assert(
      (
        await withSession(officerCookie, () =>
          actions.updatePublicAlertAction(copy),
        )
      ).ok,
    );
    const saved = await models.PublicAlert.findById(generated.id).lean();
    await assert.rejects(() =>
      withSession(citizenCookie, () =>
        actions.publishPublicAlertAction({
          id: generated.id,
          revision: saved.updatedAt.toISOString(),
        }),
      ),
    );
    assert.equal(
      (await models.PublicAlert.findById(generated.id).lean()).status,
      "draft",
    );
    pass("real Citizen session denied publication");
    await models.OfficerProfile.updateOne(
      { user: officer._id },
      { $pull: { capabilities: "public-alerts:publish" } },
    );
    await assert.rejects(
      () =>
        withSession(officerCookie, () =>
          actions.publishPublicAlertAction({
            id: generated.id,
            revision: saved.updatedAt.toISOString(),
          }),
        ),
      /capability/,
    );
    await models.OfficerProfile.updateOne(
      { user: officer._id },
      { $push: { capabilities: "public-alerts:publish" } },
    );
    pass("approved Officer without publish capability denied");
    assert(
      (
        await withSession(officerCookie, () =>
          actions.publishPublicAlertAction({
            id: generated.id,
            revision: saved.updatedAt.toISOString(),
          }),
        )
      ).ok,
    );
    const published = await models.PublicAlert.findById(generated.id).lean();
    assert.equal(published.status, "published");
    assert(published.publishedAt);
    assert.equal(published.issuedBy, organization.name);
    assert.equal(String(published.publishedBy), String(officer._id));
    const feed = await withSession(citizenCookie, () =>
      citizenActions.getAlertsAction(),
    );
    assert.equal(feed.records.length, 1);
    assert.equal(feed.records[0].title, copy.title);
    assert(!JSON.stringify(feed).includes("warning"));
    assert(!JSON.stringify(feed).includes("PRIVATE"));
    pass(
      "real Officer saves review and explicitly publishes; Mongo timestamps/authority and real Citizen action verified",
    );
    await models.PublicAlert.create({
      jurisdiction: lga._id,
      level: "watch",
      title: "Unpublished draft",
      body: "Hidden",
      status: "draft",
      channels: ["web"],
    });
    await models.PublicAlert.create({
      jurisdiction: outsiders._id,
      level: "watch",
      title: "Outside scope",
      body: "Hidden",
      status: "published",
      publishedAt: new Date(),
      channels: ["web"],
    });
    assert.equal(
      (await withSession(citizenCookie, () => citizenActions.getAlertsAction()))
        .records.length,
      1,
    );
    pass("draft and outside-jurisdiction alerts excluded from Citizen feed");
  } finally {
    globalThis.fetch = originalFetch;
  }
  await models.ConsentRecord.create({
    citizen: citizens[0]._id,
    purpose: "communityContribution",
    version: "isolated-test-policy",
    granted: false,
    effectiveAt: new Date(),
  });
  await assert.rejects(
    () => ai.patternForWarning(warningId, [String(lga._id)]),
    /INSUFFICIENT_AGGREGATED_DATA/,
  );
  pass(
    "new refusal supersedes old consent; baseline below threshold suppresses stored pattern",
  );
  console.log(
    `PASS: ${checks} integration checks. Test-only policy and threshold; no live database records changed.`,
  );
} catch (error) {
  // Never print raw provider/database errors or credential-bearing request objects.
  console.error(
    "FAIL:",
    error instanceof assert.AssertionError
      ? error.message
      : error instanceof ai.AlertPipelineError
        ? error.message
        : (error?.name ?? "Unknown error"),
  );
  if (error?.stack)
    console.error(
      error.stack
        .split("\n")
        .slice(1, 5)
        .map((line) => line.replace(/https?:\/\/[^ )]+/g, "[url]"))
        .join("\n"),
    );
  process.exitCode = 1;
} finally {
  try {
    if (
      mongoose.connection.readyState === 1 &&
      mongoose.connection.name === dbName &&
      dbName.startsWith("afyapulse_alert_test_")
    )
      await mongoose.connection.dropDatabase();
    console.log("Isolated test database cleaned up.");
  } catch {
    console.error("Test database cleanup failed; test database:", dbName);
    process.exitCode = 1;
  } finally {
    await closeDB();
  }
}
