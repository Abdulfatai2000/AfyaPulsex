import { connectDB, DatabaseUnavailableError } from "@/server/db/connection";
import { safeErrorCategory } from "@/server/lib/safe-error";
import hashPassword from "@/server/lib/hashpassword";
import { createPendingRegistration } from "@/server/services/pending-registration";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { error: "Name, email and password are required." },
      { status: 400 },
    );
  }
  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const password = body.password.trim();

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json(
      {
        error: "All fields are required",
      },
      {
        status: 400,
      },
    );
  }

  if (name?.trim() && name?.trim().length < 5) {
    return NextResponse.json(
      {
        error: "Full Name must be at least 5 characters long",
      },
      {
        status: 400,
      },
    );
  }

  if (name?.trim() && name?.trim()?.split(" ")?.length < 2) {
    return NextResponse.json(
      {
        error: "Full Name must include at least a first name and a last name",
      },
      {
        status: 400,
      },
    );
  }

  if (email?.trim() && !/^\S+@\S+\.\S+$/.test(email?.trim())) {
    return NextResponse.json(
      {
        error: "Invalid email address",
      },
      {
        status: 400,
      },
    );
  }

  if (password?.trim() && password?.trim().length < 8) {
    return NextResponse.json(
      {
        error: "Password must be at least 8 characters long",
      },
      {
        status: 400,
      },
    );
  }

  try {
    await connectDB();

    const passwordHash = await hashPassword(password);

    const result = await createPendingRegistration(email, name, passwordHash, true);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes("already exists") ? 409 : 400 },
      );
    }

    return NextResponse.json(
      {
        message: "Verification code sent to your email.",
        pendingId: result.pendingId,
        email,
      },
      {
        status: 201,
      },
    );
  } catch (err) {
    console.error("[auth.signup]", safeErrorCategory(err));
    if (err instanceof DatabaseUnavailableError)
      return NextResponse.json(
        {
          error:
            "Account creation is temporarily unavailable. Please try again shortly.",
        },
        { status: 503 },
      );
    return NextResponse.json(
      {
        error: "An error occurred while processing your request.",
      },
      {
        status: 500,
      },
    );
  }
}