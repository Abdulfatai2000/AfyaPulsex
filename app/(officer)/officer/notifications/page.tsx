import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import NotificationsCenterClient from "@/components/officer/notifications/NotificationsCenterClient";

function NotificationsFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <div className="flex min-w-0 gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white p-1">
        <Skeleton className="h-8 w-16 flex-none rounded-lg" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-24 flex-none rounded-lg" />
        ))}
      </div>
      <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white">
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
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Notifications / Alerts Center"
        description="Review operational notifications for your jurisdiction — raised health-signal baselines, pending access requests, investigation milestones, and system notices. Opening a notification marks it as read."
      />
      <Suspense fallback={<NotificationsFallback />}>
        <NotificationsCenterClient />
      </Suspense>
    </section>
  );
}