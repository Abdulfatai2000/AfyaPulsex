// OTP service — generates, stores, and verifies 6-digit OTPs with 2-minute expiry.
// Server-only; never exposes OTPs or hashes to the client.
"use server";
import { connectDB } from "@/server/db/connection";
import { EmailVerification } from "@/server/models";
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
  const cooldownEnd = new Date(doc.lastResentAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000);
  return new Date() < cooldownEnd;
}

export async function createAndSendOTP(
  userId: string,
  email: string,
  purpose: "email_verification" | "password_reset" = "email_verification",
): Promise<{ success: boolean; error?: string; cooldownSeconds?: number }> {
  await connectDB();

  const existing = await EmailVerification.findOne({ user: userId, purpose, consumedAt: null })
    .sort({ createdAt: -1 })
    .lean();

  if (existing) {
    if (isRateLimited(existing)) {
      return { success: false, error: "Too many resend attempts. Please try again later." };
    }
    if (isResendCooldown(existing)) {
      const cooldownEnd = new Date(existing.lastResentAt!.getTime() + RESEND_COOLDOWN_SECONDS * 1000);
      const cooldownSeconds = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
      return { success: false, error: "Please wait before requesting another code.", cooldownSeconds };
    }
  }

  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await EmailVerification.findOneAndUpdate(
    { user: userId, purpose, consumedAt: null },
    {
      $set: {
        email,
        otpHash,
        expiresAt,
        attempts: 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
        lastResentAt: new Date(),
        $inc: { resendCount: 1 },
      },
    },
    { upsert: true, new: true },
  );

  const { sendEmail } = await import("@/server/services/email");
  const subject = purpose === "email_verification"
    ? "Verify your AfyaPulse email"
    : "Reset your AfyaPulse password";
  const html = purpose === "email_verification"
    ? `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #0f172a;">Verify your AfyaPulse email</h1>
          <p>Your 6-digit verification code is:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; background: #f0f5fb; border-radius: 8px; margin: 16px 0; color: #08214a;">${otp}</div>
          <p><strong>This code expires in 2 minutes.</strong></p>
          <p>If you didn't create an AfyaPulse account, you can ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b;">This is an automated message from AfyaPulse. Please do not reply.</p>
        </div>
      `
    : `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #0f172a;">Reset your AfyaPulse password</h1>
          <p>Your 6-digit reset code is:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; background: #f0f5fb; border-radius: 8px; margin: 16px 0; color: #08214a;">${otp}</div>
          <p><strong>This code expires in 2 minutes.</strong></p>
          <p>If you didn't request a password reset, you can ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b;">This is an automated message from AfyaPulse. Please do not reply.</p>
        </div>
      `;

  const result = await sendEmail({ to: email, subject, html, eventType: "submitted" });
  if (!result.success) {
    return { success: false, error: "Failed to send verification email. Please try again." };
  }

  return { success: true };
}

export async function verifyOTP(
  userId: string,
  otp: string,
  purpose: "email_verification" | "password_reset" = "email_verification",
): Promise<{ success: boolean; error?: string }> {
  await connectDB();

  if (!/^\d{6}$/.test(otp)) {
    return { success: false, error: "Invalid code format." };
  }

  const doc = await EmailVerification.findOne({ user: userId, purpose, consumedAt: null })
    .sort({ createdAt: -1 })
    .lean();

  if (!doc) {
    return { success: false, error: "No verification code found. Please request a new one." };
  }

  if (doc.attempts >= doc.maxAttempts) {
    return { success: false, error: "Too many failed attempts. Please request a new code." };
  }

  if (new Date() > new Date(doc.expiresAt)) {
    return { success: false, error: "Code has expired. Please request a new one." };
  }

  const otpHash = hashOTP(otp);
  if (otpHash !== doc.otpHash) {
    await EmailVerification.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
    return { success: false, error: "Incorrect code. Please try again." };
  }

  await EmailVerification.updateOne(
    { _id: doc._id },
    { $set: { consumedAt: new Date() } }
  );

  return { success: true };
}

export async function markEmailVerified(userId: string): Promise<void> {
  await connectDB();
  const { User } = await import("@/server/models");
  await User.findByIdAndUpdate(userId, { emailVerified: new Date() });
}

export async function checkEmailVerified(userId: string): Promise<boolean> {
  await connectDB();
  const { User } = await import("@/server/models");
  const user = await User.findById(userId).select("emailVerified").lean();
  return !!user?.emailVerified;
}