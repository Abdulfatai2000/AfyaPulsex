"use client";

import { NotificationBell } from "@/components/officer/notifications/NotificationBell";
import { OfficerProfileMenu } from "./OfficerProfileMenu";

/**
 * Shared account cluster (data-mode switch + notification bell + officer
 * profile menu) used by the desktop topbar and the compact mobile header — a
 * single implementation for both breakpoints.
 */
export function OfficerAccountArea({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
      <NotificationBell />
      <OfficerProfileMenu compact={compact} />
    </div>
  );
}