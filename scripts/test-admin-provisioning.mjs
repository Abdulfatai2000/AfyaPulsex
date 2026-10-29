// Opt-in integration test: no real application accounts are changed.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

config({ path: ".env.local", quiet: true });
if (process.env.ADMIN_PROVISION_TEST !== "1") throw new Error("Set ADMIN_PROVISION_TEST=1 to run the isolated integration test.");
const dbName = `ap_admin_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const uri = new URL(process.env.MONGODB_URI);
uri.pathname = `/${dbName}`;
process.env.MONGODB_URI = uri.toString();
process.env.AUTH_URL = "http://localhost:3000";
globalThis.AsyncLocalStorage = AsyncLocalStorage;
const { provisionAdmin } = await import("./provision-admin.ts");
const { User } = await import("../server/models/User.ts");
const { closeDB } = await import("../server/db/connection.ts");
const password = randomUUID();
const email = `${randomUUID()}@example.invalid`;
try {
  assert.equal(await provisionAdmin(` ${email.toUpperCase()} `, password), "created");
  assert.equal(mongoose.connection.name, dbName);
  const admin = await User.findOne({ email }).select("+passwordHash").lean();
  assert.equal(admin.role, "admin");
  assert.equal(admin.accountStatus, "active");
  assert(!admin.emailVerified);
  assert(await bcrypt.compare(password, admin.passwordHash));
  assert.equal(bcrypt.getRounds(admin.passwordHash), 10);
  assert.equal(await provisionAdmin(email, randomUUID()), "already-provisioned");
  const unchanged = await User.findById(admin._id).select("+passwordHash").lean();
  assert.equal(unchanged.passwordHash, admin.passwordHash);
  assert.equal(+unchanged.updatedAt, +admin.updatedAt);
  console.log("PASS: normalized email, explicit active Admin, shared bcrypt hashing, idempotent rerun; no forged email verification");

  const accounts = [];
  for (const role of ["citizen", "officer"]) {
    const user = await User.create({ name: "Isolated test", email: `${randomUUID()}@example.invalid`, role, passwordHash: admin.passwordHash });
    assert.equal(await provisionAdmin(user.email, password), "existing-account");
    const after = await User.findById(user._id).select("+passwordHash").lean();
    assert.equal(after.role, role); assert.equal(after.passwordHash, admin.passwordHash);
    accounts.push(user);
  }
  console.log("PASS: existing Citizen/Officer accounts are never promoted or overwritten");

  const { handlers } = await import("../server/auth/config.ts");
  const { NextRequest } = await import("next/server.js");
  async function login(user) {
    const csrfResponse = await handlers.GET(new NextRequest("http://localhost:3000/api/auth/csrf"));
    const { csrfToken } = await csrfResponse.json();
    const cookie = csrfResponse.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    const response = await handlers.POST(new NextRequest("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
      body: new URLSearchParams({ csrfToken, email: user.email, password, callbackUrl: "http://localhost:3000/admin/dashboard" }),
    }));
    const sessionCookie = response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    assert(sessionCookie.includes("authjs.session-token"));
    return sessionCookie;
  }
  const { createRequestStoreForAPI } = await import("next/dist/server/async-storage/request-store.js");
  const { workUnitAsyncStorage } = await import("next/dist/server/app-render/work-unit-async-storage.external.js");
  const { workAsyncStorage } = await import("next/dist/server/app-render/work-async-storage.external.js");
  function requestContext(cookie, fn) {
    const req = new NextRequest("http://localhost:3000/admin/dashboard", { headers: { cookie, host: "localhost:3000", "x-forwarded-proto": "http" } });
    const store = createRequestStoreForAPI(req, { pathname: "/admin/dashboard" }, { tags: [], expirationsByCacheKind: new Map() }, undefined, undefined, undefined);
    return workAsyncStorage.run({ route: "/admin/dashboard", isStaticGeneration: false }, () => workUnitAsyncStorage.run(store, fn));
  }
  const { requireAdmin } = await import("../server/auth/rbac.ts");
  const adminCookie = await login(admin);
  assert.equal((await requestContext(adminCookie, requireAdmin)).role, "admin");
  await assert.rejects(() => requestContext("", requireAdmin), /NEXT_REDIRECT/);
  for (const account of accounts) {
    const cookie = await login(account);
    await assert.rejects(() => requestContext(cookie, requireAdmin), /NEXT_REDIRECT/);
  }
  console.log("PASS: real Auth.js session accepts Admin; server guard rejects anonymous, Citizen and Officer sessions");

  await User.updateOne({ _id: admin._id }, { $set: { accountStatus: "deactivated" } });
  assert.equal(await provisionAdmin(email, password), "existing-account");
  await assert.rejects(() => requestContext(adminCookie, requireAdmin), /NEXT_REDIRECT/);
  console.log("PASS: inactive account remains inactive on rerun and cannot access Admin routes with an old session");

  const { adminLoginAction } = await import("../app/(auth)/admin/login/actions.ts");
  for (const account of [...accounts, admin]) {
    const form = new FormData(); form.set("email", account.email); form.set("password", password);
    const result = await adminLoginAction({ error: "" }, form);
    assert(result.error);
  }
  console.log("PASS: Admin login action rejects Citizen, Officer and inactive Admin accounts");
} catch (error) {
  console.error("FAIL:", error instanceof assert.AssertionError ? "Assertion failed" : error?.name ?? "Unknown error");
  process.exitCode = 1;
} finally {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName && dbName.startsWith("ap_admin_test_")) {
      await mongoose.connection.dropDatabase();
      console.log("Isolated test database cleaned up; application accounts unchanged.");
    }
  } catch { console.error("Test cleanup failed:", dbName); process.exitCode = 1; }
  finally { await closeDB(); }
}
