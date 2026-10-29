import { auth } from "@/server/auth/config";
import { connectDB } from "@/server/db/connection";
import { AccessRequest } from "@/server/models";
import { OfficerProfile } from "@/server/models";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectDB();

    const officerProfile = await OfficerProfile.findOne({ user: session.user.id }).lean();
    if (!officerProfile) {
      return NextResponse.json({ error: "No officer profile found" }, { status: 404 });
    }

    const accessRequest = await AccessRequest.findOne({ officer: officerProfile._id })
      .sort({ createdAt: -1 })
      .lean();

    if (!accessRequest) {
      return NextResponse.json({ error: "No access request found" }, { status: 404 });
    }

    return NextResponse.json({
      id: accessRequest._id.toString(),
      status: accessRequest.status,
      submittedAt: accessRequest.createdAt.toISOString(),
      decidedAt: accessRequest.decidedAt?.toISOString() || null,
      justification: accessRequest.justification,
    });
  } catch (err) {
    console.error("[MyAccessRequest] Error:", err);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}