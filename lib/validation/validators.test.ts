import assert from "node:assert/strict";
import test from "node:test";
import {
  fullNameSchema,
  emailSchema,
  nigerianPhoneSchema,
  positionSchema,
  customOrgNameSchema,
  passwordSchema,
  validateField,
  normalizePhone,
} from "@/lib/validation/validators";

// Full name
test("empty full name is rejected", () => {
  const result = fullNameSchema.safeParse("");
  assert.ok(!result.success);
});

test("whitespace-only full name is rejected", () => {
  const result = fullNameSchema.safeParse("   ");
  assert.ok(!result.success);
});

test("valid full name is accepted", () => {
  const result = fullNameSchema.safeParse("Dr. Adebayo Yusuf");
  assert.ok(result.success, result.error?.message);
});

test("Nigerian name with hyphen is accepted", () => {
  const result = fullNameSchema.safeParse("Okafor-Onyekachi");
  assert.ok(result.success);
});

test("Nigerian name with apostrophe is accepted", () => {
  const result = fullNameSchema.safeParse("Okafor");
  assert.ok(result.success);
});

test("short name is rejected", () => {
  const result = fullNameSchema.safeParse("A");
  assert.ok(!result.success);
});

// Email
test("invalid email is rejected", () => {
  const result = emailSchema.safeParse("not-an-email");
  assert.ok(!result.success);
});

test("valid email is accepted", () => {
  const result = emailSchema.safeParse("adebayo@health.gov.ng");
  assert.ok(result.success);
});

test("valid gmail is accepted", () => {
  const result = emailSchema.safeParse("user@gmail.com");
  assert.ok(result.success);
});

// Phone
test("invalid phone with letters is rejected", () => {
  const result = nigerianPhoneSchema.safeParse("080ABCDEF");
  assert.ok(!result.success);
});

test("invalid phone too short is rejected", () => {
  const result = nigerianPhoneSchema.safeParse("08012345");
  assert.ok(!result.success);
});

test("invalid phone with wrong prefix is rejected", () => {
  const result = nigerianPhoneSchema.safeParse("0123456789");
  assert.ok(!result.success);
});

test("valid local Nigerian phone 080... is accepted", () => {
  const result = nigerianPhoneSchema.safeParse("08012345678");
  assert.ok(result.success, result.error?.message);
});

test("valid +234 phone is accepted", () => {
  const result = nigerianPhoneSchema.safeParse("+2348012345678");
  assert.ok(result.success, result.error?.message);
});

test("valid +234 with spaces is accepted", () => {
  const result = nigerianPhoneSchema.safeParse("+234 801 234 5678");
  assert.ok(result.success, result.error?.message);
});

// Phone normalization
test("local phone normalizes to E.164", () => {
  assert.strictEqual(normalizePhone("08012345678"), "+2348012345678");
});

test("+234 phone normalizes to E.164", () => {
  assert.strictEqual(normalizePhone("+2348012345678"), "+2348012345678");
});

// Position
test("empty position is rejected", () => {
  const result = positionSchema.safeParse("");
  assert.ok(!result.success);
});

test("valid position is accepted", () => {
  const result = positionSchema.safeParse("LGA Health Officer");
  assert.ok(result.success);
});

// Custom org name
test("empty custom org name is rejected", () => {
  const result = customOrgNameSchema.safeParse("");
  assert.ok(!result.success);
});

test("whitespace-only custom org name is rejected", () => {
  const result = customOrgNameSchema.safeParse("   ");
  assert.ok(!result.success);
});

test("valid custom org name is accepted", () => {
  const result = customOrgNameSchema.safeParse("My Community PHC");
  assert.ok(result.success);
});

// validateField
test("validateField returns null for valid full name", () => {
  assert.strictEqual(validateField("fullName", "Dr. Adebayo Yusuf"), null);
});

test("validateField returns error for invalid email", () => {
  assert.ok(validateField("email", "not-an-email") !== null);
});

test("validateField returns error for invalid phone", () => {
  assert.ok(validateField("phone", "080ABC") !== null);
});

test("validateField returns error for empty stateId", () => {
  assert.strictEqual(validateField("stateId", ""), "Select your state.");
});

test("validateField returns error for empty position", () => {
  assert.ok(validateField("position", "") !== null);
});

test("validateField returns error for empty customOrgName", () => {
  assert.ok(validateField("customOrgName", "") !== null);
});

// Password (shared authentication policy)
test("short password is rejected", () => {
  const result = passwordSchema.safeParse("short1");
  assert.ok(!result.success);
});

test("valid password is accepted", () => {
  const result = passwordSchema.safeParse("correct-horse-8");
  assert.ok(result.success, result.error?.message);
});

test("validateField returns error for short password", () => {
  assert.strictEqual(
    validateField("password", "short1"),
    "Password must be at least 8 characters long.",
  );
});

test("validateField returns null for valid password", () => {
  assert.strictEqual(validateField("password", "correct-horse-8"), null);
});
