import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import ResponseCenterClient from "@/components/officer/response/ResponseCenterClient";

function ResponsesFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <div className="flex min-w-0 gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white p-1">
        <Skeleton className="h-8 w-32 flex-none rounded-lg" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-28 flex-none rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export default function ResponsePage() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Response"
        description="Operational responses directed from aggregate signals within your jurisdiction. Responses track through a workflow  Directed, Reviewing, Monitoring, Escalated, Response, Resolved  and show aggregate signal guidance and authorized operational details only."
      />
      <Suspense fallback={<ResponsesFallback />}>
        <ResponseCenterClient />
      </Suspense>
    </section>
  );
}