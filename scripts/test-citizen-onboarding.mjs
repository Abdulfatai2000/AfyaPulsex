// Run after npm run build. Real HTTP/Auth.js cookies; isolated database; no emails sent.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, randomInt, createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { registerHooks } from "node:module";
import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

config({ path: ".env.local", quiet: true });
if (process.env.CITIZEN_ONBOARDING_TEST !== "1") throw new Error("Set CITIZEN_ONBOARDING_TEST=1 to run this isolated test.");
const dbName = `ap_onboard_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
let uri;
try { uri = new URL(process.env.MONGODB_URI); } catch { throw new Error("Database configuration unavailable."); }
uri.pathname = `/${dbName}`;
process.env.MONGODB_URI = uri.toString();
const port = 3187;
const base = `http://localhost:${port}`;
process.env.AUTH_URL = base;
process.env.NEXTAUTH_URL = base;
process.env.AUTH_SECRET ||= randomUUID() + randomUUID();
globalThis.AsyncLocalStorage = AsyncLocalStorage;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: new URL("../node_modules/server-only/empty.js", import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { connectDB, closeDB } = await import("../server/db/connection.ts");
const { User, PendingRegistration, Jurisdiction } = await import("../server/models/index.ts");
const { NextRequest } = await import("next/server.js");
const { createRequestStoreForAPI } = await import("next/dist/server/async-storage/request-store.js");
const { workUnitAsyncStorage } = await import("next/dist/server/app-render/work-unit-async-storage.external.js");
const { workAsyncStorage } = await import("next/dist/server/app-render/work-async-storage.external.js");
function requestContext(cookie, fn) {
  const req = new NextRequest(`${base}/onboarding`, { headers: { cookie, host: `localhost:${port}`, "x-forwarded-proto": "http" } });
  const store = createRequestStoreForAPI(req, { pathname: "/onboarding" }, { tags: [], expirationsByCacheKind: new Map() }, undefined, undefined, undefined);
  return workAsyncStorage.run({ route: "/onboarding", isStaticGeneration: false }, () => workUnitAsyncStorage.run(store, fn));
}
const cookieOf = response => response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
const post = (path, data, cookie = "") => fetch(`${base}${path}`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(data), redirect: "manual" });
async function login(email, password) {
  const csrf = await fetch(`${base}/api/auth/csrf`);
  const { csrfToken } = await csrf.json();
  const response = await fetch(`${base}/api/auth/callback/credentials`, { method: "POST", redirect: "manual",
    headers: { cookie: cookieOf(csrf), "content-type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: `${base}/dashboard` }),
  });
  const cookie = cookieOf(response); assert(cookie.includes("authjs.session-token")); return cookie;
}
async function expectRedirect(path, cookie, target) {
  const response = await fetch(`${base}${path}`, { headers: { cookie }, redirect: "manual" });
  if ([303, 307, 308].includes(response.status)) assert.equal(new URL(response.headers.get("location"), base).pathname, target);
  else {
    // Next may stream a redirect if the shell has already rendered.
    const html = await response.text();
    assert(html.includes("NEXT_REDIRECT") && html.includes(target), `${path} must redirect to ${target}`);
  }
}
let server;
try {
  await connectDB(); assert.equal(mongoose.connection.name, dbName);
  // Supply the country reference normally seeded in the application database.
  // Raw insertion omits the model's partial Point default (coordinates absent).
  await Jurisdiction.collection.insertOne({ code: "NG", name: "Nigeria", level: "country", parent: null });
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port)], { env: process.env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  // Never forward server logs containing request or account metadata.
  server.stdout.resume(); server.stderr.resume();
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error("Test server failed to start.");
    try { if ((await fetch(`${base}/admin/login`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert(ready, "Test server ready");
  const email = `${randomUUID()}@example.invalid`; const password = randomUUID();
  const otp = String(randomInt(100000, 1000000));
  const pending = await PendingRegistration.create({ email, fullName: "Onboarding Test", passwordHash: await bcrypt.hash(password, 10),
    otpHash: createHash("sha256").update(otp).digest("hex"), expiresAt: new Date(Date.now() + 120000) });
  const verified = await post("/api/auth/verify-otp", { pendingId: String(pending._id), otp });
  assert.equal(verified.status, 200, "Verification succeeds");
  const response = await verified.json();
  assert(!("passwordHash" in response) && !("token" in response));
  const cookie = cookieOf(verified); assert(cookie.includes("authjs.session-token"), "HTTP verification response issues session cookie");
  assert(verified.headers.getSetCookie().some(value => value.includes("authjs.session-token") && /httponly/i.test(value)));
  const session = await (await fetch(`${base}/api/auth/session`, { headers: { cookie } })).json();
  assert.equal(session.user.id, response.userId); assert.equal(session.user.role, "citizen");
  const stored = await User.findById(response.userId).select("+verificationSignInTokenHash +verificationSignInExpiresAt").lean();
  assert(stored.emailVerified); assert(!stored.verificationSignInTokenHash); assert(!stored.verificationSignInExpiresAt);
  assert.equal((await fetch(`${base}/onboarding`, { headers: { cookie }, redirect: "manual" })).status, 200);
  console.log("PASS: OTP -> verified User -> real HttpOnly Auth.js cookie -> onboarding; grant consumed and never returned");

  for (const path of ["/dashboard", "/profile", "/report", "/my-health", "/vitals", "/alerts"]) await expectRedirect(path, cookie, "/onboarding");
  const { requireCitizen } = await import("../server/auth/rbac.ts");
  await assert.rejects(() => requestContext(cookie, requireCitizen), /NEXT_REDIRECT/);
  console.log("PASS: all six normal Citizen pages and the shared action guard block incomplete onboarding");

  const { saveOnboardingStepAction, submitOnboardingAction } = await import("../server/actions/citizen/onboarding.ts");
  const { getCitizenOnboarding } = await import("../server/services/citizen-onboarding.ts");
  const draft = { personal: { fullName: "Onboarding Test", dateOfBirth: "1990-01-01", gender: "undisclosed" },
    location: { country: "Nigeria", state: "Osun", district: "Ife Central", community: "" },
    healthProfile: { bloodGroup: "", allergiesText: "", conditionsText: "", medicationsText: "" }, healthProfileSkipped: true,
    privacy: { personalTrackingAcknowledged: true, communityContribution: { purpose: "community_insights", decision: "declined", policyVersion: null, recordedAt: null } } };
  await requestContext(cookie, () => saveOnboardingStepAction(draft, 0));
  // A fresh credentials login simulates closing the app and returning without the previous cookie.
  const returningCookie = await login(email, password);
  const resumed = await requestContext(returningCookie, getCitizenOnboarding);
  assert.equal(resumed.step, 1); assert.equal(resumed.complete, false); assert.equal(resumed.draft.personal.dateOfBirth, "1990-01-01");
  await expectRedirect("/dashboard", returningCookie, "/onboarding");
  const onboarding = await fetch(`${base}/onboarding`, { headers: { cookie: returningCookie }, redirect: "manual" });
  assert.equal(onboarding.status, 200); assert((await onboarding.text()).includes("Where are you located?"));
  console.log("PASS: credentials login resumes the saved incomplete step and draft without another OTP");

  await requestContext(returningCookie, () => saveOnboardingStepAction(draft, 1));
  await requestContext(returningCookie, () => saveOnboardingStepAction(draft, 2));
  await requestContext(returningCookie, () => submitOnboardingAction(draft));
  const completedCookie = await login(email, password);
  assert.equal((await requestContext(completedCookie, getCitizenOnboarding)).complete, true);
  assert.equal((await requestContext(completedCookie, requireCitizen)).userId, response.userId);
  assert.equal((await fetch(`${base}/dashboard`, { headers: { cookie: completedCookie }, redirect: "manual" })).status, 200);
  await expectRedirect("/onboarding", completedCookie, "/dashboard");
  console.log("PASS: completion persists, credentials login reaches Dashboard, completed users leave onboarding");

  const csrfResponse = await fetch(`${base}/api/auth/csrf`); const { csrfToken } = await csrfResponse.json();
  const denied = await fetch(`${base}/api/auth/callback/verified-signup`, { method: "POST", redirect: "manual", headers: { cookie: cookieOf(csrfResponse), "content-type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ csrfToken, token: randomUUID().replaceAll("-", "").repeat(2), callbackUrl: `${base}/onboarding` }) });
  assert(!cookieOf(denied).includes("authjs.session-token"));
  assert.equal((await post("/api/auth/verify-otp", { pendingId: String(pending._id), otp })).status, 400);
  console.log("PASS: invented sign-in grants and consumed OTPs cannot mint another session");
} catch (error) {
  console.error("FAIL:", error instanceof assert.AssertionError ? error.message : error?.name ?? "Unknown error");
  if (error?.name === "MongoServerError") console.error("Database error code:", error.code, "codeName:", error.codeName);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) { server.kill(); await new Promise(resolve => server.once("exit", resolve)); }
  try { if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName && dbName.startsWith("ap_onboard_test_")) await mongoose.connection.dropDatabase(); }
  catch { console.error("Test cleanup failed:", dbName); process.exitCode = 1; }
  finally { await closeDB(); }
  console.log("Isolated test cleaned up. No real user, OTP or onboarding progress changed.");
}
