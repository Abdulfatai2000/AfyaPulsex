import { auth } from "@/server/auth/config";
import { connectDB } from "@/server/db/connection";
import { OfficerProfile, User } from "@/server/models";
import { safeErrorCategory } from "@/server/lib/safe-error";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectDB();

    const officerProfile = await OfficerProfile.findOne({
      user: session.user.id,
    }).lean();
    const user = await User.findById(session.user.id).select("role").lean();
    if (!officerProfile) {
      return NextResponse.json(
        { error: "No officer profile found", status: "none" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: officerProfile.status,
      canAccess:
        user?.role === "officer" &&
        officerProfile.status === "approved" &&
        (!officerProfile.setupRequired || !!officerProfile.setupCompletedAt) &&
        !!officerProfile.jurisdiction,
      approvedAt: officerProfile.approvedAt,
    });
  } catch (err) {
    console.error("[officer.status]", safeErrorCategory(err));
    return NextResponse.json(
      { error: "Officer access verification is temporarily unavailable." },
      { status: 503 },
    );
  }
}
