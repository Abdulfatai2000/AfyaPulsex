/** Integration test: uses a newly created, uniquely named disposable database only. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { config } from "dotenv";
import { existsSync } from "node:fs";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { provisionDemo, validateDemoCredentials } from "./provision-demo";
import { closeDB } from "../server/db/connection";
import { User, OfficerProfile, CitizenProfile, HealthEvent, PublicAlert } from "../server/models";
import { listHealthEvents, reportHealthEvent } from "../server/services/health-events";
import { listVitalReadings, recordVitalReading } from "../server/services/vitals";
import { accountRecordFilter } from "../server/services/account-environment";
import { authorizeDemoAccount } from "../server/auth/demo-account";
import { publishedCitizenFeed } from "../server/services/public-alerts";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });
const originalUri = process.env.MONGODB_URI;
assert.ok(originalUri, "MONGODB_URI must be configured.");
const databaseName = `afyademo_${randomBytes(12).toString("hex")}`;
const uri = new URL(originalUri);
uri.pathname = `/${databaseName}`;
process.env.MONGODB_URI = uri.toString();
process.env.AUTH_SECRET = randomBytes(32).toString("hex");
process.env.AUTH_URL = "http://localhost:3107";
const password = randomBytes(24).toString("base64url");
const citizenInput = { email: "citizen@example.invalid", password };
const officerInput = { email: "officer@example.invalid", password };
let server: ReturnType<typeof spawn> | undefined;
let browser: import("puppeteer-core").Browser | undefined;
let passed = 0;
let stage = "database checks";
function pass(label: string) { passed++; console.log(`PASS: ${label}`); }

async function main() {
  assert.throws(() => validateDemoCredentials(citizenInput, citizenInput));
  assert.throws(() => validateDemoCredentials({ ...citizenInput, password: "" }, officerInput));
  assert.throws(() => validateDemoCredentials({ ...citizenInput, password: "x".repeat(73) }, officerInput));
  pass("Credential validation rejects duplicate email, empty and overlong passwords");
  await provisionDemo(citizenInput, officerInput);
  assert.equal(mongoose.connection.name, databaseName);
  const citizen = await User.findOne({ demoSlot: "citizen" }).select("+passwordHash").orFail();
  const officer = await User.findOne({ demoSlot: "officer" }).orFail();
  assert.ok(citizen.isDemo && citizen.simulation && citizen.emailVerified && citizen.onboardingCompletedAt);
  assert.equal(citizen.accountStatus, "active");
  assert.ok(await bcrypt.compare(password, citizen.passwordHash!));
  const originalHash = citizen.passwordHash;
  await provisionDemo({ ...citizenInput, password: randomBytes(24).toString("hex") }, officerInput);
  assert.equal((await User.findById(citizen._id).select("+passwordHash").orFail()).passwordHash, originalHash);
  assert.equal(await User.countDocuments({ isDemo: true }), 2);
  assert.equal(await HealthEvent.countDocuments({ citizen: citizen._id }), 5);
  pass("Provisioning is idempotent, marks verified accounts and preserves password hashes");
  const officerProfile = await OfficerProfile.findOne({ user: officer._id }).orFail();
  assert.equal(officerProfile.status, "approved");
  assert.ok(officerProfile.setupCompletedAt);
  assert.equal(officerProfile.approvalAuthority?.canApproveOfficerAccess, false);
  const normal = await User.create({ name: "Live Test Citizen", email: "live@example.invalid", role: "citizen",
    passwordHash: originalHash, emailVerified: new Date(), onboardingCompletedAt: new Date() });
  const normalOfficer = await User.create({ name: "Live Test Officer", email: "live-officer@example.invalid", role: "officer",
    passwordHash: originalHash, emailVerified: new Date() });
  await OfficerProfile.create({ user: normalOfficer._id, jurisdiction: officerProfile.jurisdiction, status: "approved",
    setupCompletedAt: new Date(), governmentLevel: "federal", capabilities: ["signals:read", "warnings:read", "explorer:read"] });
  await assert.rejects(() => provisionDemo({ email: normal.email, password }, officerInput));
  assert.equal((await User.findById(normal._id).orFail()).isDemo, false);
  pass("Provisioning refuses normal account collisions; demo Officer receives no approval authority");
  await HealthEvent.create([
    { citizen: normal._id, symptoms: [{ name: "Live only", severity: 2 }], simulation: false },
    { citizen: normal._id, symptoms: [{ name: "Must not leak", severity: 2 }], simulation: true },
    { citizen: citizen._id, symptoms: [{ name: "Must not leak", severity: 2 }], simulation: false },
  ]);
  assert.deepEqual(await accountRecordFilter(String(normal._id)), { simulation: { $ne: true } });
  assert.deepEqual(await accountRecordFilter(String(citizen._id)), { simulation: true });
  assert.equal((await listHealthEvents(String(normal._id), {})).length, 1);
  assert.equal((await listHealthEvents(String(citizen._id), {})).length, 5);
  assert.equal((await listVitalReadings(String(citizen._id), new Date(0), new Date())).length, 20);
  const demoReport = await reportHealthEvent(String(citizen._id), new HealthEvent({
    simulation: false, symptoms: [{ name: "Demo submission", severity: 3 }], onsetAt: new Date(),
  }).toObject());
  const liveReport = await reportHealthEvent(String(normal._id), new HealthEvent({
    simulation: true, symptoms: [{ name: "Live submission", severity: 2 }], onsetAt: new Date(),
  }).toObject());
  assert.equal(demoReport.simulation, true);
  assert.equal(liveReport.simulation, false);
  const liveHistory = await listHealthEvents(String(normal._id), {});
  const demoHistory = await listHealthEvents(String(citizen._id), {});
  assert.ok(liveHistory.some(event => event.symptoms[0]?.name === "Live submission"));
  assert.ok(demoHistory.some(event => event.symptoms[0]?.name === "Demo submission"));
  assert.ok(liveHistory.every(event => !event.simulation && String(event.citizen) === String(normal._id)));
  assert.ok(demoHistory.every(event => event.simulation && String(event.citizen) === String(citizen._id)));
  const dashboardHistory = await listHealthEvents(String(citizen._id), {
    from: new Date(Date.now() - 86400000), dateField: "onsetAt",
  });
  assert.ok(dashboardHistory.some(event => event.symptoms[0]?.name === "Demo submission"));
  await assert.rejects(() => recordVitalReading(String(citizen._id), {}));
  pass("Live/demo report submissions override forged markers and remain isolated in history/dashboard; demo vitals remain read-only");
  if (process.argv.includes("--reports-only")) return;
  const countryId = String(officerProfile.jurisdiction);
  await PublicAlert.create({ title: "Live only alert", body: "Live test notice", level: "info", jurisdiction: countryId,
    status: "published", channels: ["web"], publishedAt: new Date(), simulation: false });
  assert.equal((await publishedCitizenFeed([countryId], true)).length, 2);
  assert.deepEqual((await publishedCitizenFeed([countryId], false)).map(a => a.title), ["Live only alert"]);
  pass("Published alerts cannot cross the live/demo boundary");
  const request = new Request("http://localhost:3107");
  assert.equal(await authorizeDemoAccount("admin", request), null);
  assert.equal((await authorizeDemoAccount("citizen", request))?.id, String(citizen._id));
  assert.equal((await authorizeDemoAccount("officer", request))?.id, String(officer._id));
  await User.updateOne({ _id: citizen._id }, { accountStatus: "deactivated" });
  assert.equal(await authorizeDemoAccount("citizen", request), null);
  await User.updateOne({ _id: citizen._id }, { accountStatus: "active" });
  pass("Demo login allows only designated active accounts; admin/disabled access denied");

  stage = "production server startup";
  // Run the actual production application and real Auth.js cookie flow.
  const require = createRequire(import.meta.url);
  server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", "3107"], {
    env: { ...process.env, NODE_ENV: "production" }, windowsHide: true, stdio: "ignore",
  });
  for (let tries = 0; tries < 60; tries++) {
    try { if ((await fetch("http://localhost:3107/api/auth/providers")).ok) break; } catch { /* Wait for this server. */ }
    if (tries === 59) throw new Error("Test production server did not start.");
    await new Promise(r => setTimeout(r, 500));
  }
  stage = "browser launch";
  const puppeteer: typeof import("puppeteer-core") = require("puppeteer-core");
  // Portable Chrome detection: try common locations
  const chromePaths = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((p): p is string => Boolean(p));
  let executablePath: string | undefined;
  for (const path of chromePaths) {
    if (existsSync(path)) { executablePath = path; break; }
  }
  browser = await puppeteer.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const runtimeErrors: string[] = [];
  page.on("pageerror", () => runtimeErrors.push("Browser runtime error"));
  async function open(path: string) {
    stage = path;
    const response = await page.goto(`http://localhost:3107${path}`, { waitUntil: "networkidle2", timeout: 60000 });
    assert.ok(response && response.status() < 500, `Route ${path} failed`);
  }
  async function button(label: string) {
    const buttons = await page.$$("button");
    for (const item of buttons) {
      if ((await item.evaluate(el => el.textContent))?.trim() === label) { await item.click(); return; }
    }
    throw new Error(`Button not found: ${label}`);
  }
  async function logout() {
    await page.evaluate(async () => {
      const { csrfToken } = await (await fetch("/api/auth/csrf")).json();
      await fetch("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
        body: new URLSearchParams({ csrfToken, callbackUrl: "/auth" }) });
    });
    const session = await page.evaluate(async () => (await fetch("/api/auth/session")).json());
    assert.ok(!session?.user);
  }
  await open("/auth");
  await button("Try Citizen Demo");
  await page.waitForFunction(() => location.pathname === "/dashboard", { timeout: 60000 });
  for (const route of ["/dashboard", "/my-health", "/vitals", "/alerts", "/profile"]) {
    await open(route);
    assert.ok((await page.$eval("body", el => el.textContent))?.includes("Demo Account"));
  }
  await open("/officer/overview");
  assert.notEqual(new URL(page.url()).pathname, "/officer/overview");
  await open("/admin/dashboard");
  assert.notEqual(new URL(page.url()).pathname, "/admin/dashboard");
  await open("/profile?tab=security");
  // The shared Citizen security panel uses the normal Auth.js logout path.
  await button("Security");
  await button("Sign out");
  await page.waitForFunction(() => location.pathname === "/auth", { timeout: 30000 });
  pass("Try Citizen Demo creates a real session; pages load, role guards and UI sign-out work");
  await open("/auth?entry=officer");
  await button("Try Officer Demo");
  await page.waitForFunction(() => location.pathname === "/officer/overview", { timeout: 60000 });
  for (const route of ["overview", "map", "warnings", "explorer", "investigations", "analytics", "response", "public-alerts", "reports", "notifications"]) {
    await open(`/officer/${route}`);
    assert.equal(new URL(page.url()).pathname, `/officer/${route}`);
    const content = await page.$eval("body", el => el.textContent);
    assert.ok(content?.includes("Demo Account"));
    assert.ok(!content?.includes("Data Mode:"));
  }
  await open("/officer/map");
  await page.waitForSelector(".leaflet-overlay-pane path", { timeout: 30000 });
  const colors = await page.$$eval(".leaflet-overlay-pane path", nodes => [...new Set(nodes.map(n => n.getAttribute("fill")))]);
  assert.ok(colors.length >= 4, "All four demo map categories must render");
  await open("/dashboard");
  assert.notEqual(new URL(page.url()).pathname, "/dashboard");
  await logout();
  pass("Try Officer Demo, all ten data pages, four Leaflet categories, cross-role guard and logout");
  // A legacy mode cookie must not make an ordinary account see fixtures.
  await open("/auth");
  await page.setCookie({ name: "afyapulse-data-mode", value: "demo", domain: "localhost", path: "/" });
  await page.type("#email", normal.email);
  await page.type("#password", password);
  await page.$eval("form", form => form.requestSubmit());
  await page.waitForFunction(() => location.pathname === "/dashboard", { timeout: 60000 });
  await open("/dashboard");
  assert.ok(!(await page.$eval("body", el => el.textContent))?.includes("Demo Account"));
  await logout();
  await open("/auth?entry=officer");
  await page.type("#email", normalOfficer.email);
  await page.type("#password", password);
  await page.$eval("form", form => form.requestSubmit());
  await page.waitForFunction(() => location.pathname === "/officer/overview", { timeout: 60000 });
  await open("/officer/map");
  const liveOfficerContent = await page.$eval("body", el => el.textContent);
  assert.ok(!liveOfficerContent?.includes("Demo Account"));
  assert.equal((await page.$$(".leaflet-overlay-pane path")).length, 0);
  await open("/officer/explorer");
  await button("Saved Queries");
  assert.ok(!(await page.$eval("body", el => el.textContent))?.includes("Ife Central - elevated signals"));
  await logout();
  pass("Normal Officer ignores forged demo cookie, gets no synthetic map signals or seeded queries");
  assert.equal(runtimeErrors.length, 0);
  pass("Normal credentials login stays live despite forged legacy mode cookie; no runtime errors");
  console.log(`${passed} integration checks passed.`);
}

void main().catch(error => {
  console.error("FAIL:", error instanceof Error ? error.name : "Unknown error", "at", stage);
  // Assertion text is test-owned; never emit MongoDB driver messages/URIs.
  if (error instanceof assert.AssertionError) console.error("Assertion operator:", error.operator);
  if (error instanceof Error && /^(Button not found:|Test production server did not start)/.test(error.message)) console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close().catch(() => {});
  server?.kill();
  // Never drop an existing/application database. This exact random name was made above.
  if (mongoose.connection.name === databaseName && /^afyademo_[a-f0-9]{24}$/.test(databaseName)) {
    try { await mongoose.connection.dropDatabase(); console.log("Disposable test database removed."); }
    catch { console.error("Test database cleanup failed; no other database was targeted."); process.exitCode = 1; }
  }
  await closeDB().catch(() => { process.exitCode = 1; });
});
