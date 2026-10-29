import { requireAdmin } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { User, OfficerProfile, AccessRequest, Organization, Jurisdiction } from "@/server/models";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const officerProfiles = await OfficerProfile.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const officerUserIds = officerProfiles.map((p) => p.user);
    const users = await User.find({ _id: { $in: officerUserIds } })
      .select("name email emailVerified accountStatus")
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const accessRequests = await AccessRequest.find({ officer: { $in: officerUserIds } })
      .sort({ requestedAt: -1 })
      .lean();
    const latestRequestMap = new Map(
      accessRequests.map((r) => [r.officer.toString(), r])
    );

    const orgIds = [...new Set(officerProfiles.map((p) => p.organization).filter(Boolean))];
    const orgs = await Organization.find({ _id: { $in: orgIds } })
      .select("name")
      .lean();
    const orgMap = new Map(orgs.map((o) => [o._id.toString(), o.name]));

    const jurisdictionIds = [...new Set(officerProfiles.map((p) => p.jurisdiction).filter(Boolean))];
    const jurisdictions = await Jurisdiction.find({ _id: { $in: jurisdictionIds } })
      .select("name")
      .lean();
    const jurisdictionMap = new Map(jurisdictions.map((j) => [j._id.toString(), j.name]));

    let items = officerProfiles.map((profile) => {
      const user = userMap.get(profile.user.toString());
      const latestRequest = latestRequestMap.get(profile.user.toString());
      return {
        id: profile._id.toString(),
        userId: profile.user.toString(),
        name: user?.name || "Unknown",
        email: user?.email || "Unknown",
        emailVerified: user?.emailVerified,
        accountStatus: user?.accountStatus || "active",
        badgeNumber: profile.badgeNumber,
        title: profile.title,
        department: profile.department,
        organization: profile.organization ? orgMap.get(profile.organization.toString()) || "Unknown" : null,
        jurisdiction: profile.jurisdiction ? jurisdictionMap.get(profile.jurisdiction.toString()) || "Unknown" : null,
        capabilities: profile.capabilities,
        status: profile.status,
        approvedAt: profile.approvedAt,
        accessRequest: latestRequest ? {
          status: latestRequest.status,
          requestedAt: latestRequest.requestedAt,
          scopes: latestRequest.scopes,
        } : null,
      };
    });

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.email.toLowerCase().includes(searchLower) ||
          item.badgeNumber?.toLowerCase().includes(searchLower)
      );
    }

    const total = items.length;
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);

    return NextResponse.json({
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[admin.officers.list]", err);
    return NextResponse.json({ error: "Failed to load officers" }, { status: 500 });
  }
}