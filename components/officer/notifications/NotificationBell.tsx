"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "cn";
import {
  getUnreadNotificationCount,
  subscribeNotifications,
} from "@/lib/services/officer/notifications";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import {
  getUnreadNotificationCountLive,
  subscribeLiveNotifications,
} from "@/lib/services/officer/live-adapters";

/**
 * Global header notification bell shown on every page that uses the shared
 * officer shell (desktop topbar and compact mobile header). Single source of
 * truth for the unread count per active Data Mode: the demo service store in
 * Demo mode, the live notifications feed in Live mode. Clicking the bell
 * navigates to the center — the bell is never duplicated per-page.
 */
export function NotificationBell() {
  const { mode } = useDataMode();
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const value =
        mode === "live"
          ? await getUnreadNotificationCountLive()
          : await getUnreadNotificationCount();
      setCount(value);
    } catch {
      setCount(null);
    }
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    const load =
      mode === "live"
        ? getUnreadNotificationCountLive()
        : getUnreadNotificationCount();
    void load.then(
      (value) => {
        if (!cancelled) {
          setCount(value);
        }
      },
      () => {
        if (!cancelled) {
          setCount(null);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // Re-fetch whenever the active mode's notification store changes (e.g. the
  // center marks an item read) so the count stays consistent app-wide.
  useEffect(() => {
    const reload = () => {
      const load =
        mode === "live"
          ? getUnreadNotificationCountLive()
          : getUnreadNotificationCount();
      void load.then(setCount, () => undefined);
    };
    const unsubscribeDemo = subscribeNotifications(reload);
    const unsubscribeLive = subscribeLiveNotifications(reload);
    return () => {
      unsubscribeDemo();
      unsubscribeLive();
    };
  }, [mode]);

  // Lightweight polling in live mode to detect new notifications from the server
  // without requiring manual refresh. Polls the unread count endpoint every 30s.
  useEffect(() => {
    if (mode !== "live") {
      return;
    }

    // Initial fetch already done above; start polling for subsequent updates
    const interval = setInterval(() => {
      void fetchCount();
    }, 30_000); // 30 seconds

    pollIntervalRef.current = interval;
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [mode, fetchCount]);

  const unreadCount = count ?? 0;
  const hasUnread = count !== null && count > 0;

  return (
    <button
      type="button"
      onClick={() => router.push("/officer/notifications")}
      aria-label={
        count === null
          ? "Notifications"
          : hasUnread
            ? `Unread notifications: ${unreadCount}`
            : "Notifications, no unread messages"
      }
      className={cn(
        "relative grid size-9 place-items-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-blue/60",
        "text-white hover:bg-blue-900/40",
      )}
    >
      <Bell aria-hidden="true" className="size-5 text-white" />
      {hasUnread ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full border border-white bg-danger-red px-1 text-[10px] font-semibold leading-none text-white"
        >
          {unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}