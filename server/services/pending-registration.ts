// PendingRegistration service — manages temporary registration state.
"use server";
import { connectDB } from "@/server/db/connection";
import { PendingRegistration } from "@/server/models";
import { createHash, randomBytes } from "crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 2;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS_PER_HOUR = 3;

function generateOTP(): string {
  const bytes = randomBytes(4);
  const num = bytes.readUInt32BE(0);
  return (num % 1000000).toString().padStart(OTP_LENGTH, "0");
}

function hashOTP(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function isRateLimited(doc: { resendCount: number; lastResentAt?: Date | null }): boolean {
  if (!doc.lastResentAt) return false;
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (doc.lastResentAt > hourAgo && doc.resendCount >= MAX_RESENDS_PER_HOUR) {
    return true;
  }
  return false;
}

function isResendCooldown(doc: { lastResentAt?: Date | null }): boolean {
  if (!doc.lastResentAt) return false;
  const cooldownEnd = new Date(doc.lastResentAt!.getTime() + RESEND_COOLDOWN_SECONDS * 1000);
  return new Date() < cooldownEnd;
}

async function sendOTPEmail(email: string, otp: string) {
  const { sendEmail } = await import("@/server/services/email");
  console.log("[send-email] Sending OTP email", { email: email.replace(/(.{2}).*(@.*)/, "$1***$2") });
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #0f172a;">Verify your AfyaPulse email</h1>
      <p>Your 6-digit verification code is:</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; background: #f0f5fb; border-radius: 8px; margin: 16px 0; color: #08214a;">${otp}</div>
      <p><strong>This code expires in 2 minutes.</strong></p>
      <p>If you didn't create an AfyaPulse account, you can ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #64748b;">This is an automated message from AfyaPulse. Please do not reply.</p>
    </div>
  `;
  const result = await sendEmail({ to: email, subject: "Verify your AfyaPulse email", html, eventType: "submitted" });
  console.log("[send-email] Email send result", { success: result.success, messageId: result.messageId });
  return result;
}

/**
 * Create or resume a pending registration.
 * - If no existing pending registration: generates new OTP, stores hash, sends email.
 * - If existing unconsumed pending registration: treats as resume, generates new OTP (resend behavior),
 *   updates metadata, and sends new OTP email. Respects rate limits and cooldowns.
 */
export async function createPendingRegistration(
  email: string,
  fullName: string,
  passwordHash: string,
  termsAccepted: boolean,
): Promise<{ success: boolean; error?: string; pendingId?: string; cooldownSeconds?: number }> {
  await connectDB();

  const normalizedEmail = email.trim().toLowerCase();

  // Check if completed User already exists
  const { User } = await import("@/server/models");
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    return { success: false, error: "An account with this email already exists. Sign in instead." };
  }

  // Check for existing unconsumed pending registration
  const existingPending = await PendingRegistration.findOne({
    email: normalizedEmail,
    consumedAt: null,
  }).sort({ createdAt: -1 }).lean();

  if (existingPending) {
    // Existing pending registration found - treat as resume/resend
    // Respect rate limits for resend
    if (isRateLimited(existingPending)) {
      return { success: false, error: "Too many resend attempts. Please try again later." };
    }
    if (isResendCooldown(existingPending)) {
      const cooldownEnd = new Date(existingPending.lastResentAt!.getTime() + RESEND_COOLDOWN_SECONDS * 1000);
      const cooldownSeconds = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
      return { success: false, error: "Please wait before requesting another code.", cooldownSeconds };
    }

    // Generate new OTP (this invalidates the old one - resend behavior)
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    console.log("[create-pending] Resume existing - generated new OTP", { 
      email: normalizedEmail, 
      pendingId: existingPending._id.toString(),
      expiresAt 
    });

    const pending = await PendingRegistration.findByIdAndUpdate(
      existingPending._id,
      {
        $set: {
          fullName: fullName.trim(),
          passwordHash,
          otpHash,
          expiresAt,
          attempts: 0,
          maxAttempts: OTP_MAX_ATTEMPTS,
          lastResentAt: new Date(),
          termsAccepted,
        },
        $inc: { resendCount: 1 },
      },
      { new: true },
    );

    // Send OTP email with the NEW OTP
    const result = await sendOTPEmail(email, otp);
    if (!result.success) {
      return { success: false, error: "We couldn't send your verification code. Please try again." };
    }

    return { success: true, pendingId: pending!._id.toString() };
  }

  // No existing pending registration - create new
  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  console.log("[create-pending] Generated new OTP", { 
    email: normalizedEmail, 
    expiresAt 
  });

  const pending = await PendingRegistration.findOneAndUpdate(
    { email: normalizedEmail, consumedAt: null },
    {
      $set: {
        fullName: fullName.trim(),
        passwordHash,
        otpHash,
        expiresAt,
        attempts: 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
        lastResentAt: new Date(),
        termsAccepted,
      },
      $inc: { resendCount: 1 },
    },
    { upsert: true, new: true },
  );

  // Send OTP email
  const result = await sendOTPEmail(email, otp);
  if (!result.success) {
    // If email fails, delete the pending registration
    await PendingRegistration.findByIdAndDelete(pending._id);
    return { success: false, error: "We couldn't send your verification code. Please try again." };
  }

  return { success: true, pendingId: pending._id.toString() };
}

export async function verifyPendingRegistrationOTP(
  pendingId: string,
  otp: string,
): Promise<{ success: boolean; error?: string; email?: string; fullName?: string; passwordHash?: string }> {
  await connectDB();

  if (!/^\d{6}$/.test(otp)) {
    return { success: false, error: "Invalid code format." };
  }

  // Both hashes are select:false. Verification needs them server-side; the
  // API response must continue to omit them.
  const doc = await PendingRegistration.findById(pendingId)
    .select("+otpHash +passwordHash")
    .lean();
  if (!doc) {
    console.log("[verify-otp] No pending registration found for pendingId:", pendingId);
    return { success: false, error: "No pending registration found. Please start again." };
  }

  console.log("[verify-otp] Found pending registration:", { 
    pendingId, 
    email: doc.email, 
    attempts: doc.attempts, 
    maxAttempts: doc.maxAttempts,
    expiresAt: doc.expiresAt,
    consumedAt: doc.consumedAt,
    hasOtpHash: !!doc.otpHash,
    resendCount: doc.resendCount
  });

  if (doc.consumedAt) {
    console.log("[verify-otp] Registration already consumed");
    return { success: false, error: "This registration has already been verified." };
  }

  if (doc.attempts >= doc.maxAttempts) {
    console.log("[verify-otp] Max attempts exceeded");
    return { success: false, error: "Too many failed attempts. Please start registration again." };
  }

  if (new Date() > new Date(doc.expiresAt)) {
    console.log("[verify-otp] OTP expired", { now: new Date(), expiresAt: doc.expiresAt });
    return { success: false, error: "Code has expired. Please request a new one." };
  }

  const otpHash = hashOTP(otp);
  console.log("[verify-otp] Hash comparison", { 
    submittedOtpLength: otp.length, 
    match: otpHash === doc.otpHash
  });

  if (otpHash !== doc.otpHash) {
    await PendingRegistration.updateOne({ _id: pendingId }, { $inc: { attempts: 1 } });
    console.log("[verify-otp] Hash mismatch - incorrect code");
    return { success: false, error: "Incorrect code. Please try again." };
  }

  // Mark as consumed
  await PendingRegistration.updateOne({ _id: pendingId }, { $set: { consumedAt: new Date() } });
  console.log("[verify-otp] OTP verified successfully");

  return {
    success: true,
    email: doc.email,
    fullName: doc.fullName,
    passwordHash: doc.passwordHash,
  };
}

export async function resendPendingRegistrationOTP(
  pendingId: string,
): Promise<{ success: boolean; error?: string; cooldownSeconds?: number }> {
  await connectDB();

  const doc = await PendingRegistration.findById(pendingId).lean();
  if (!doc) {
    console.log("[resend-otp] No pending registration found", { pendingId });
    return { success: false, error: "No pending registration found. Please start again." };
  }

  if (doc.consumedAt) {
    console.log("[resend-otp] Registration already consumed", { pendingId });
    return { success: false, error: "This registration has already been verified." };
  }

  if (isRateLimited(doc)) {
    console.log("[resend-otp] Rate limited", { pendingId });
    return { success: false, error: "Too many resend attempts. Please try again later." };
  }

  if (isResendCooldown(doc)) {
    const cooldownEnd = new Date(doc.lastResentAt!.getTime() + RESEND_COOLDOWN_SECONDS * 1000);
    const cooldownSeconds = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
    console.log("[resend-otp] In cooldown", { pendingId, cooldownSeconds });
    return { success: false, error: "Please wait before requesting another code.", cooldownSeconds };
  }

  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  console.log("[resend-otp] Generated new OTP", { 
    pendingId, 
    expiresAt 
  });

  await PendingRegistration.updateOne(
    { _id: pendingId },
    {
      $set: {
        otpHash,
        expiresAt,
        attempts: 0,
        lastResentAt: new Date(),
      },
      $inc: { resendCount: 1 },
    },
  );

  // Send OTP email
  const result = await sendOTPEmail(doc.email, otp);
  console.log("[resend-otp] Email send result", { success: result.success, messageId: result.messageId });
  if (!result.success) {
    return { success: false, error: "Failed to send verification email. Please try again." };
  }

  return { success: true };
}

export async function getPendingRegistration(pendingId: string) {
  await connectDB();
  return PendingRegistration.findById(pendingId).select("email fullName createdAt expiresAt").lean();
}
