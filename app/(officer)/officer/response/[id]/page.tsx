import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import ResponseDetailClient from "@/components/officer/response/ResponseDetailClient";

// TODO(DEV3): load the authorized resource by id; handle missing resources.
// TODO(DEV4): enforce officer capabilities, jurisdiction, and privacy before
//   reads, and drive the accessState prop from the authorized session.

function ResponseDetailSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-8 w-full rounded-lg" />
      <Skeleton className="h-8 w-2/3 rounded-lg" />
      <Skeleton className="h-4 w-1/2 rounded" />
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
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
        title="Response Details"
        description="A single aggregate response for your jurisdiction, its live workflow position, operational timeline, and authorized action controls — presented as aggregate indicators only."
      />
      <Suspense fallback={<ResponseDetailSkeleton />}>
        <ResponseDetailClient id={id} />
      </Suspense>
    </section>
  );
}