import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicAlertDetailClient } from "@/components/officer/public-alerts/PublicAlertDetailClient";

// TODO(DEV3): load the authorized alert reference by id; handle missing alerts.
// TODO(DEV4): enforce officer capabilities, jurisdiction, and privacy before
//   reads, and drive the session-expired/unauthorized states from the
//   authorized session.

function PublicAlertDetailSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-4 w-32 rounded" />
      <div className="flex min-w-0 flex-col gap-5 rounded-xl border border-gray-200 bg-white p-6">
        <Skeleton className="h-6 w-2/3 rounded-lg" />
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-8 w-56 rounded-full" />
      </div>
    </div>
  );
}

export default async function PublicAlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Public Alert Details"
        description="A single public-health alert for your jurisdiction: its message, target area, lifecycle status, publication date, and delivery channels — aggregate public-health information only."
      />
      <Suspense fallback={<PublicAlertDetailSkeleton />}>
        <PublicAlertDetailClient id={id} />
      </Suspense>
    </section>
  );
}