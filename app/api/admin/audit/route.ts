import { requireAdmin } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { AuditLog, User } from "@/server/models";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const action = searchParams.get("action");
    const actorId = searchParams.get("actorId");

    const query: Record<string, unknown> = {};
    if (action) query.action = action;
    if (actorId) query.actor = actorId;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    const actorIds = [...new Set(logs.map((l) => l.actor?.toString()).filter(Boolean))];
    const actors = await User.find({ _id: { $in: actorIds } })
      .select("name email")
      .lean();
    const actorMap = new Map(actors.map((u) => [u._id.toString(), { name: u.name, email: u.email }]));

    const items = logs.map((log) => {
      const actor = log.actor ? actorMap.get(log.actor.toString()) : null;
      return {
        id: log._id.toString(),
        action: log.action,
        targetEmail: log.targetEmail,
        targetRole: log.targetRole,
        actorName: actor?.name || "Unknown",
        actorEmail: actor?.email || "Unknown",
        reason: log.reason,
        metadata: log.metadata,
        timestamp: log.createdAt,
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
    console.error("[admin.audit.list]", err);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}