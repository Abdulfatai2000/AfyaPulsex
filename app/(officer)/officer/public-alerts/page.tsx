import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import PublicAlertCenterClient from "@/components/officer/public-alerts/PublicAlertCenterClient";

function PublicAlertsFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <div className="flex min-w-0 gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white p-1">
        <Skeleton className="h-8 w-24 flex-none rounded-lg" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-28 flex-none rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export default function PublicAlertsPage() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Public Health Alerts"
        description="Active public-health messaging across your jurisdiction. Alerts move through Draft, Under Review, Published, and Expired, show publication dates, and carry aggregate public-health information only — never individual records."
      />
      <Suspense fallback={<PublicAlertsFallback />}>
        <PublicAlertCenterClient />
      </Suspense>
    </section>
  );
}