import { requireAdmin } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { User, OfficerProfile, AccessRequest } from "@/server/models";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const [totalCitizens, totalOfficers, pendingRequests, suspendedAccounts, unverifiedEmails] = await Promise.all([
      User.countDocuments({ role: "citizen" }),
      User.countDocuments({ role: "officer" }),
      AccessRequest.countDocuments({ status: "pending" }),
      User.countDocuments({ accountStatus: "suspended" }),
      User.countDocuments({ role: "citizen", emailVerified: null }),
    ]);

    return NextResponse.json({
      totalCitizens,
      totalOfficers,
      pendingOfficerRequests: pendingRequests,
      suspendedAccounts,
      unverifiedEmails,
    });
  } catch (err) {
    console.error("[admin.stats]", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}