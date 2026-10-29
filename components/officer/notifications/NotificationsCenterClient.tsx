"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { SessionExpiredState } from "@/components/feedback/SessionExpiredState";
import type {
  NotificationTab,
  NotificationTabCounts,
  OfficerNotification,
} from "@/lib/services/officer/notifications";
import {
  NOTIFICATION_TABS,
  NotificationsServiceError,
  deriveNotificationsStatus,
  getNotifications,
  markNotificationAsRead,
} from "@/lib/services/officer/notifications";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import {
  getNotificationsLive,
  markNotificationAsReadLive,
} from "@/lib/services/officer/live-adapters";
import { NotificationCategoryTabs } from "./NotificationCategoryTabs";
import { NotificationList } from "./NotificationList";

const VALID_TABS: ReadonlyArray<NotificationTab> = NOTIFICATION_TABS.map(
  (tab) => tab.value,
);

const TAB_LABELS: Record<NotificationTab, string> = {
  all: "notifications",
  "access-request": "access requests",
  "health-signal": "health signal notifications",
  investigation: "investigations",
  system: "system notifications",
};

function mapTabParam(value: string | null): NotificationTab {
  return VALID_TABS.includes(value as NotificationTab)
    ? (value as NotificationTab)
    : "all";
}

function NotificationListSkeleton() {
  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white"
      aria-busy="true"
      aria-label="Loading notifications"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-gray-100 p-4 last:border-b-0"
        >
          <Skeleton className="size-9 flex-none rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="mt-2 h-3 w-full rounded" />
          </div>
          <Skeleton className="h-7 w-20 flex-none rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function NotificationsState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-6 py-12 text-center">
      {icon}
      <p className="text-sm font-semibold text-deep-navy">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export default function NotificationsCenterClient() {
  const { mode } = useDataMode();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = mapTabParam(searchParams.get("tab"));

  const [tab, setTab] = useState<NotificationTab>(requestedTab);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [items, setItems] = useState<OfficerNotification[]>([]);
  const [counts, setCounts] = useState<NotificationTabCounts | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<
    "loading" | "ready" | "empty" | "unauthorized" | "session-expired" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);

  // Initial + tab/page/reload/mode-driven fetch. State updates happen inside
  // async callbacks, never in the effect body; stale responses are dropped.
  // Centralized Data Mode: demo store or the live notifications feed.
  useEffect(() => {
    let cancelled = false;
    resolveOfficerData(mode, {
      demo: () => getNotifications({ category: tab, page, limit: 10 }),
      live: () => getNotificationsLive({ category: tab, page, limit: 10 }),
    })
      .then((data) => {
        if (cancelled) {
          return;
        }
        setItems(data.items);
        setCounts(data.counts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setStatus(deriveNotificationsStatus(data.items.length));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const mapped = mapFetchErrorStatus(err, NotificationsServiceError);
        if (mapped === "unauthorized") {
          setStatus("unauthorized");
        } else if (mapped === "session-expired") {
          setStatus("session-expired");
        } else {
          setStatus("error");
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong loading notifications.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, tab, page, reloadKey]);

  const handleTabChange = (next: NotificationTab) => {
    if (next === tab) {
      return;
    }
    setStatus("loading");
    setTab(next);
    setPage(1);
  };

  const handleRetry = () => {
    setStatus("loading");
    setError(null);
    setReloadKey((value) => value + 1);
  };

  const handleReset = () => {
    setStatus("loading");
    setTab("all");
    setPage(1);
  };

  const handleAction = (notification: OfficerNotification) => {
    // Optimistic read-state; the header bell re-syncs via the service
    // subscription (there is only one notification store per mode).
    setItems((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, unread: false } : item,
      ),
    );
    const markRead =
      mode === "live"
        ? markNotificationAsReadLive(notification.id)
        : markNotificationAsRead(notification.id);
    void markRead.catch(() => undefined);
    router.push(notification.href);
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setStatus("loading");
      setPage((value) => value - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setStatus("loading");
      setPage((value) => value + 1);
    }
  };

  const unreadInView = items.filter((item) => item.unread).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NotificationCategoryTabs
          value={tab}
          onChange={handleTabChange}
          counts={counts}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          type="button"
          aria-label="Refresh notifications"
        >
          <RefreshCw aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {status === "loading" ? (
        <NotificationListSkeleton />
      ) : status === "session-expired" ? (
        <SessionExpiredState title="Your session has expired" />
      ) : status === "unauthorized" ? (
        <NotificationsState
          icon={<TriangleAlert className="h-5 w-5 text-danger-red" aria-hidden="true" />}
          title="Notifications access restricted"
          description="You are not authorized to view notifications for the current session. Backend authorization remains authoritative for your access."
          action={
            <Button variant="outline" size="sm" onClick={handleReset} type="button">
              Return to authorized area
            </Button>
          }
        />
      ) : status === "error" ? (
        <NotificationsState
          icon={<TriangleAlert className="h-5 w-5 text-danger-red" aria-hidden="true" />}
          title="Unable to load notifications"
          description={
            error ?? "The notifications could not be loaded. Please try again."
          }
          action={
            <Button variant="outline" size="sm" onClick={handleRetry} type="button">
              Retry
            </Button>
          }
        />
      ) : status === "empty" ? (
        <EmptyState
          className="w-full"
          title={`No ${TAB_LABELS[tab]} yet`}
          description="Nothing is waiting here right now. New operational updates will appear here — for example raised baselines, pending access requests, or investigation milestones."
        />
      ) : (
        <>
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-muted-foreground"
          >
            {total} notification{total === 1 ? "" : "s"}
            {unreadInView > 0 ? (
              <>
                {" "}
                · <span className="font-medium text-primary-blue">
                  {unreadInView} unread in this view
                </span>
              </>
            ) : null}
          </p>

          <NotificationList items={items} onAction={handleAction} />

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={page <= 1}
                  type="button"
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                  type="button"
                >
                  Next
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}

          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-2.5 text-[11px] text-muted-foreground"
            role="note"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" />
            <span>
              Notifications are aggregate public-health signals and
              organization events only — never individual records.
            </span>
          </div>
        </>
      )}
    </div>
  );
}