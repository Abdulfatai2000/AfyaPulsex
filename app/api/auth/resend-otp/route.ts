import { connectDB, DatabaseUnavailableError } from "@/server/db/connection";
import { safeErrorCategory } from "@/server/lib/safe-error";
import { resendPendingRegistrationOTP } from "@/server/services/pending-registration";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { pendingId, purpose = "email_verification" } = body || {};

  if (!pendingId) {
    return NextResponse.json(
      { error: "Pending registration ID is required." },
      { status: 400 },
    );
  }

  try {
    const result = await resendPendingRegistrationOTP(pendingId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, cooldownSeconds: result.cooldownSeconds },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Verification code sent." },
      { status: 200 },
    );
  } catch (err) {
    console.error("[auth.resend-otp]", safeErrorCategory(err));
    if (err instanceof DatabaseUnavailableError) {
      return NextResponse.json(
        { error: "Resend is temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 },
    );
  }
}