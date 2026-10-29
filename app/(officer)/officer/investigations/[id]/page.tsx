import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import InvestigationDetailClient from "@/components/officer/investigations/InvestigationDetailClient";

// TODO(DEV3): load the authorized resource by id; handle missing resources.
// TODO(DEV4): enforce officer capabilities, jurisdiction, and privacy before
//   reads, and drive the accessState prop from the authorized session.

function InvestigationDetailSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-4 w-32 rounded" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 w-2/3 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-1/2 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className="flex gap-1 overflow-hidden rounded-xl border border-gray-200 bg-white p-1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-8 w-16 flex-none rounded-lg" />
        ))}
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
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
        title="Investigation Details"
        description="A single aggregate investigation for your jurisdiction. Presented as aggregate indicators and authorized operational details only — never as individual records."
      />
      <Suspense fallback={<InvestigationDetailSkeleton />}>
        <InvestigationDetailClient id={id} />
      </Suspense>
    </section>
  );
}