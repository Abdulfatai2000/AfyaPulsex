"use server";

import { requireAdmin } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { User, AccessRequest, AuditLog } from "@/server/models";

export interface AdminStats {
  totalCitizens: number;
  totalOfficers: number;
  pendingOfficerRequests: number;
  suspendedAccounts: number;
  unverifiedEmails: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  targetEmail: string;
  actorName: string;
  timestamp: string;
}

export interface AdminDashboardData {
  stats: AdminStats;
  recentActivity: RecentActivity[];
}

export async function getAdminDashboardDataAction(): Promise<AdminDashboardData> {
  await requireAdmin();
  await connectDB();

  const [
    [totalCitizens, totalOfficers, pendingRequests, suspendedAccounts, unverifiedEmails],
    logs,
  ] = await Promise.all([
    Promise.all([
      User.countDocuments({ role: "citizen" }),
      User.countDocuments({ role: "officer" }),
      AccessRequest.countDocuments({ status: "pending" }),
      User.countDocuments({ accountStatus: "suspended" }),
      User.countDocuments({ role: "citizen", emailVerified: null }),
    ]),
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const actorIds = [...new Set(logs.map((l) => l.actor?.toString()).filter(Boolean))];
  const actors = actorIds.length
    ? await User.find({ _id: { $in: actorIds } }).select("name email").lean()
    : [];
  const actorMap = new Map(actors.map((u) => [u._id.toString(), { name: u.name, email: u.email }]));

  const recentActivity: RecentActivity[] = logs.map((log) => {
    const actor = log.actor ? actorMap.get(log.actor.toString()) : null;
    return {
      id: log._id.toString(),
      action: log.action,
      targetEmail: log.targetEmail || "",
      actorName: actor?.name || "Unknown",
      timestamp: log.createdAt ? log.createdAt.toISOString() : new Date().toISOString(),
    };
  });

  return {
    stats: {
      totalCitizens,
      totalOfficers,
      pendingOfficerRequests: pendingRequests,
      suspendedAccounts,
      unverifiedEmails,
    },
    recentActivity,
  };
}

