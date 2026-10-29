import { connectDB, DatabaseUnavailableError } from "@/server/db/connection";
import { safeErrorCategory } from "@/server/lib/safe-error";
import { User } from "@/server/models";
import { verifyPendingRegistrationOTP } from "@/server/services/pending-registration";
import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/server/auth/config";
import { createHash, randomBytes } from "node:crypto";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { pendingId, otp, purpose = "email_verification" } = body || {};

  if (!pendingId || !otp) {
    return NextResponse.json(
      { error: "Pending registration ID and OTP are required." },
      { status: 400 },
    );
  }

  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return NextResponse.json(
      { error: "Invalid OTP format." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    const result = await verifyPendingRegistrationOTP(pendingId, otp);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    // Create the real User now that OTP is verified
    const signInToken = randomBytes(32).toString("hex");
    const user = await User.create({
      role: "citizen",
      name: result.fullName,
      email: result.email,
      passwordHash: result.passwordHash,
      emailVerified: new Date(),
      verificationSignInTokenHash: createHash("sha256").update(signInToken).digest("hex"),
      verificationSignInExpiresAt: new Date(Date.now() + 60_000),
    });

    // Auth.js sets its normal HttpOnly session cookie on this route response.
    // The one-time grant and password hash never leave the server.
    await signIn("verified-signup", { token: signInToken, redirect: false, redirectTo: "/onboarding" });

    return NextResponse.json(
      { message: "Email verified successfully.", email: user.email, userId: user._id.toString() },
      { status: 200 },
    );
  } catch (err) {
    console.error("[auth.verify-otp]", safeErrorCategory(err));
    if (err instanceof DatabaseUnavailableError) {
      return NextResponse.json(
        { error: "Verification is temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }
    // Handle duplicate key error (race condition)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === 11000
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in instead." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 },
    );
  }
}
