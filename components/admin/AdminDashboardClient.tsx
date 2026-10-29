"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Users, BadgeCheck, AlertTriangle, Clock, TrendingUp, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

export function AdminDashboardClient({
  initialStats,
  initialActivity,
}: {
  initialStats?: AdminStats;
  initialActivity?: RecentActivity[];
}) {
  const [stats, setStats] = useState<AdminStats | null>(initialStats ?? null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>(initialActivity ?? []);
  const [loading, setLoading] = useState(!initialStats);
  const [error, setError] = useState<string | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (initialStats) return;
    }
    async function load() {
      try {
        setLoading(true);
        const [statsRes, activityRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/audit?limit=10"),
        ]);
        if (!statsRes.ok) throw new Error("Failed to load stats");
        if (!activityRes.ok) throw new Error("Failed to load activity");
        const statsData = await statsRes.json();
        const activityData = await activityRes.json();
        setStats(statsData);
        setRecentActivity(activityData.items || []);
      } catch {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [initialStats]);

  const statCards = stats ? [
    {
      title: "Total Citizens",
      value: stats.totalCitizens.toLocaleString(),
      icon: Users,
      color: "bg-blue-100 text-blue-600",
      href: "/admin/users",
    },
    {
      title: "Total Officers",
      value: stats.totalOfficers.toLocaleString(),
      icon: BadgeCheck,
      color: "bg-green-100 text-green-600",
      href: "/admin/officers",
    },
    {
      title: "Pending Officer Requests",
      value: stats.pendingOfficerRequests.toLocaleString(),
      icon: Clock,
      color: "bg-yellow-100 text-yellow-600",
      href: "/admin/officers?status=pending",
    },
    {
      title: "Suspended Accounts",
      value: stats.suspendedAccounts.toLocaleString(),
      icon: AlertTriangle,
      color: "bg-red-100 text-red-600",
      href: "/admin/users?status=suspended",
    },
    {
      title: "Unverified Emails",
      value: stats.unverifiedEmails.toLocaleString(),
      icon: TrendingUp,
      color: "bg-purple-100 text-purple-600",
      href: "/admin/users?emailVerified=false",
    },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#08214A]">Admin Dashboard</h1>
            <p className="text-gray-600">Account and access management overview</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {statCards.map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">—</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#08214A]">Admin Dashboard</h1>
          <p className="text-gray-600">Account and access management overview</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href} className="no-underline">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <stat.icon className={`size-4 ${stat.color}`} aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#08214A]">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/users" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Users className="size-4" aria-hidden="true" />
                <span>Manage Citizens</span>
              </Button>
            </Link>
            <Link href="/admin/officers" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <BadgeCheck className="size-4" aria-hidden="true" />
                <span>Manage Officers</span>
              </Button>
            </Link>
            <Link href="/admin/audit" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <ClipboardList className="size-4" aria-hidden="true" />
                <span>View Audit Log</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Admin Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <AlertTriangle className="size-4 text-blue-600" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#08214A]">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.targetEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{activity.actorName}</p>
                      <p className="text-xs text-gray-400">{new Date(activity.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
