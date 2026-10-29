"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Download, AlertTriangle, RotateCcw, UserCheck, UserX, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  action: string;
  targetEmail: string;
  targetRole: string;
  actorName: string;
  actorEmail: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

interface AuditResponse {
  items: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function AdminAuditClient() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    action: "" as string | null,
    search: "",
  });

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (filters.action) params.set("action", filters.action);
      if (filters.search) params.set("search", filters.search);
      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) throw new Error("Failed to load audit log");
      const data: AuditResponse = await res.json();
      setEntries(data.items);
      setPagination((prev) => ({ ...prev, total: data.total, totalPages: data.totalPages }));
    } catch {
      setError("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "suspend":
        return <PauseCircle className="size-4 text-red-600" aria-hidden="true" />;
      case "reactivate":
        return <RotateCcw className="size-4 text-green-600" aria-hidden="true" />;
      case "deactivate":
        return <UserX className="size-4 text-gray-600" aria-hidden="true" />;
      default:
        return <AlertTriangle className="size-4 text-blue-600" aria-hidden="true" />;
    }
  };

  const formatAction = (action: string) => {
    return action.charAt(0).toUpperCase() + action.slice(1);
  };

  if (loading && entries.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#08214A]">Audit Log</h1>
            <p className="text-gray-600">Security-sensitive admin actions trail</p>
          </div>
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
          <h1 className="text-2xl font-bold text-[#08214A]">Audit Log</h1>
          <p className="text-gray-600">Security-sensitive admin actions trail</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={loading}>
            <Download className="size-4 mr-2" aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" aria-hidden="true" />
              <Input
                placeholder="Search by email, actor, or reason..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.action} onValueChange={(value) => setFilters((f) => ({ ...f, action: value }))}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actions</SelectItem>
                <SelectItem value="suspend">Suspend</SelectItem>
                <SelectItem value="reactivate">Reactivate</SelectItem>
                <SelectItem value="deactivate">Deactivate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Metadata</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      No audit entries found
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getActionIcon(entry.action)}
                          <span className="font-medium text-[#08214A]">{formatAction(entry.action)}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {entry.targetRole?.charAt(0).toUpperCase() + entry.targetRole?.slice(1) || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#08214A]">{entry.targetEmail}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#08214A]">{entry.actorName}</p>
                        <p className="text-sm text-gray-500">{entry.actorEmail}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {entry.reason || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 font-mono max-w-xs truncate">
                        {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {format(new Date(entry.timestamp), "MMM d, yyyy HH:mm:ss")}
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
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
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