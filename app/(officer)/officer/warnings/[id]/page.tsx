import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import WarningDetailClient from "@/components/officer/warnings/WarningDetailClient";

// TODO(DEV3): load the authorized resource by id; handle missing resources.
// TODO(DEV4): enforce officer capabilities, jurisdiction, and privacy before
//   reads, and drive the accessState prop from the authorized session.

function WarningDetailSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Skeleton className="h-52 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Early Warning details"
        description="A single aggregated warning signal for your jurisdiction. Presented as aggregate indicators only, never as individual records."
      />
      <Suspense fallback={<WarningDetailSkeleton />}>
        <WarningDetailClient id={id} />
      </Suspense>
    </section>
  );
}