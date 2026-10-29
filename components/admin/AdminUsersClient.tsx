"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Filter, MoreVertical, UserCheck, UserX, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";

interface User {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "officer" | "admin";
  emailVerified: string | null;
  accountStatus: "active" | "suspended" | "deactivated";
  suspendedUntil: string | null;
  suspensionReason: string | null;
  createdAt: string;
  jurisdiction: string | null;
  officerProfile: {
    badgeNumber: string;
    title: string;
    status: string;
    capabilities: string[];
  } | null;
}

interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    role: "" as string | null,
    status: "" as string | null,
    emailVerified: "" as string | null,
    search: "",
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (filters.role) params.set("role", filters.role);
      if (filters.status) params.set("status", filters.status);
      if (filters.emailVerified) params.set("emailVerified", filters.emailVerified);
      if (filters.search) params.set("search", filters.search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to load users");
      const data: UsersResponse = await res.json();
      setUsers(data.items);
      setPagination((prev) => ({ ...prev, total: data.total, totalPages: data.totalPages }));
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAction = async (userId: string, action: "suspend" | "reactivate" | "deactivate") => {
    const reason = action === "suspend" || action === "deactivate"
      ? prompt(`Reason for ${action}ing this account:`)
      : undefined;
    if ((action === "suspend" || action === "deactivate") && !reason) return;

    try {
      setActionLoading(userId);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed");
      }
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.accountStatus === "suspended") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <PauseCircle className="size-3" aria-hidden="true" />
          Suspended
          {user.suspendedUntil && (
            <span className="ml-1">until {format(new Date(user.suspendedUntil), "MMM d, yyyy")}</span>
          )}
        </span>
      );
    }
    if (user.accountStatus === "deactivated") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          <Trash2 className="size-3" aria-hidden="true" />
          Deactivated
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <UserCheck className="size-3" aria-hidden="true" />
        Active
      </span>
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#08214A]">User Management</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#08214A]">User Management</h1>
          <p className="text-gray-600">Manage citizen and officer accounts</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" aria-hidden="true" />
              <Input
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.role} onValueChange={(value) => setFilters((f) => ({ ...f, role: value }))}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roles</SelectItem>
                <SelectItem value="citizen">Citizen</SelectItem>
                <SelectItem value="officer">Officer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => setFilters((f) => ({ ...f, status: value }))}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.emailVerified} onValueChange={(value) => setFilters((f) => ({ ...f, emailVerified: value }))}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Email verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="true">Verified</SelectItem>
                <SelectItem value="false">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email Verified</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Registered</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-[#08214A]">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.officerProfile && (
                            <p className="text-xs text-blue-600">{user.officerProfile.title} • {user.officerProfile.badgeNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {user.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-sm text-green-600">
                            <UserCheck className="size-3" aria-hidden="true" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm text-yellow-600">
                            <UserX className="size-3" aria-hidden="true" />
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(user)}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === user.id}>
                              <MoreVertical className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[180px]">
                            {user.accountStatus === "active" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleAction(user.id, "suspend")}
                                  className="text-red-600 focus:text-red-600"
                                  disabled={actionLoading === user.id}
                                >
                                  <PauseCircle className="size-3 mr-2" aria-hidden="true" />
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAction(user.id, "deactivate")}
                                  className="text-red-600 focus:text-red-600"
                                  disabled={actionLoading === user.id}
                                >
                                  <Trash2 className="size-3 mr-2" aria-hidden="true" />
                                  Deactivate
                                </DropdownMenuItem>
                              </>
                            )}
                            {user.accountStatus === "suspended" && (
                              <DropdownMenuItem
                                onClick={() => handleAction(user.id, "reactivate")}
                                disabled={actionLoading === user.id}
                              >
                                <PlayCircle className="size-3 mr-2" aria-hidden="true" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}