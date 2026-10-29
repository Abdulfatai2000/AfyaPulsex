"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Filter, MoreVertical, BadgeCheck, Shield, AlertTriangle, Clock } from "lucide-react";
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

interface Officer {
  id: string;
  userId: string;
  name: string;
  email: string;
  emailVerified: string | null;
  accountStatus: "active" | "suspended" | "deactivated";
  badgeNumber: string;
  title: string;
  department: string;
  organization: string | null;
  jurisdiction: string | null;
  capabilities: string[];
  status: "pending" | "approved" | "suspended";
  approvedAt: string | null;
  accessRequest: {
    status: string;
    requestedAt: string;
    scopes: string[];
  } | null;
}

interface OfficersResponse {
  items: Officer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function AdminOfficersClient() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    status: "" as string | null,
    search: "",
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadOfficers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      const res = await fetch(`/api/admin/officers?${params}`);
      if (!res.ok) throw new Error("Failed to load officers");
      const data: OfficersResponse = await res.json();
      setOfficers(data.items);
      setPagination((prev) => ({ ...prev, total: data.total, totalPages: data.totalPages }));
    } catch {
      setError("Failed to load officers");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadOfficers();
  }, [loadOfficers]);

  const getStatusBadge = (officer: Officer) => {
    if (officer.status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <Clock className="size-3" aria-hidden="true" />
          Pending
        </span>
      );
    }
    if (officer.status === "suspended") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <AlertTriangle className="size-3" aria-hidden="true" />
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <BadgeCheck className="size-3" aria-hidden="true" />
        Approved
      </span>
    );
  };

  const getAccountStatusBadge = (officer: Officer) => {
    if (officer.accountStatus === "suspended") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Suspended
        </span>
      );
    }
    if (officer.accountStatus === "deactivated") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          Deactivated
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Active
      </span>
    );
  };

  if (loading && officers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#08214A]">Officer Management</h1>
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
          <h1 className="text-2xl font-bold text-[#08214A]">Officer Management</h1>
          <p className="text-gray-600">Manage public health officer accounts and access</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" aria-hidden="true" />
              <Input
                placeholder="Search by name, email, or badge number..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.status} onValueChange={(value) => setFilters((f) => ({ ...f, status: value }))}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Officer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Access Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Account Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email Verified</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jurisdiction</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Capabilities</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {officers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      No officers found
                    </td>
                  </tr>
                ) : (
                  officers.map((officer) => (
                    <tr key={officer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-[#08214A]">{officer.name}</p>
                          <p className="text-sm text-gray-500">{officer.email}</p>
                          <p className="text-xs text-blue-600">{officer.title} • {officer.badgeNumber}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(officer)}</td>
                      <td className="px-4 py-4">{getAccountStatusBadge(officer)}</td>
                      <td className="px-4 py-4">
                        {officer.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-sm text-green-600">
                            <BadgeCheck className="size-3" aria-hidden="true" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm text-yellow-600">
                            <Shield className="size-3" aria-hidden="true" />
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {officer.jurisdiction || "—"}
                        {officer.organization && <span className="ml-2 text-xs text-gray-400">({officer.organization})</span>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {officer.capabilities.map((cap) => (
                            <span key={cap} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === officer.id}>
                              <MoreVertical className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[200px]">
                            <DropdownMenuItem
                              onClick={() => {
                                window.open(`/admin/users/${officer.userId}`, "_blank");
                              }}
                            >
                              <BadgeCheck className="size-3 mr-2" aria-hidden="true" />
                              View User Details
                            </DropdownMenuItem>
                            {officer.accountStatus === "active" && (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                disabled={actionLoading === officer.id}
                              >
                                Suspend Account
                              </DropdownMenuItem>
                            )}
                            {officer.accountStatus === "suspended" && (
                              <DropdownMenuItem
                                disabled={actionLoading === officer.id}
                              >
                                Reactivate Account
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
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} officers
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