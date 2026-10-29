import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import InvestigationsCenterClient from "@/components/officer/investigations/InvestigationsCenterClient";

function InvestigationsFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <div className="flex w-full gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export default function InvestigationsPage() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Investigations"
        description="Operational investigations opened from aggregate signals within your jurisdiction. Investigations show aggregate signal guidance and authorized operational details only — never individual citizen records."
      />
      <Suspense fallback={<InvestigationsFallback />}>
        <InvestigationsCenterClient />
      </Suspense>
    </section>
  );
}