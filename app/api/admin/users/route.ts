import { requireAdmin } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { User, CitizenProfile, OfficerProfile } from "@/server/models";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const emailVerified = searchParams.get("emailVerified");
    const search = searchParams.get("search");

    const query: Record<string, unknown> = {};
    if (role) query.role = role;
    if (status) query.accountStatus = status;
    if (emailVerified === "true") query.emailVerified = { $ne: null };
    if (emailVerified === "false") query.emailVerified = null;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query)
        .select("name email role emailVerified accountStatus suspendedUntil suspensionReason createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const userIds = users.map((u) => u._id);
    const [citizenProfiles, officerProfiles] = await Promise.all([
      CitizenProfile.find({ user: { $in: userIds } })
        .select("user jurisdiction address")
        .lean(),
      OfficerProfile.find({ user: { $in: userIds } })
        .select("user badgeNumber title organization jurisdiction status capabilities")
        .lean(),
    ]);

    const citizenProfileMap = new Map(citizenProfiles.map((p) => [p.user.toString(), p]));
    const officerProfileMap = new Map(officerProfiles.map((p) => [p.user.toString(), p]));

    const items = users.map((user) => {
      const citizenProfile = citizenProfileMap.get(user._id.toString());
      const officerProfile = officerProfileMap.get(user._id.toString());

      let jurisdiction = null;
      if (citizenProfile?.jurisdiction) jurisdiction = citizenProfile.jurisdiction.toString();
      else if (officerProfile?.jurisdiction) jurisdiction = officerProfile.jurisdiction.toString();

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        accountStatus: user.accountStatus || "active",
        suspendedUntil: user.suspendedUntil,
        suspensionReason: user.suspensionReason,
        createdAt: user.createdAt,
        jurisdiction,
        officerProfile: officerProfile ? {
          badgeNumber: officerProfile.badgeNumber,
          title: officerProfile.title,
          status: officerProfile.status,
          capabilities: officerProfile.capabilities,
        } : null,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[admin.users.list]", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}