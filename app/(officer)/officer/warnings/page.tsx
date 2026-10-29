import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import WarningsCenterClient from "@/components/officer/warnings/WarningsCenterClient";

function WarningsFallback() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function WarningsPage() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Early Warning Center"
        description="Unusual aggregate patterns across your jurisdiction that require review. Warnings are presented as aggregated signals — never as individual records."
      />
      <Suspense fallback={<WarningsFallback />}>
        <WarningsCenterClient />
      </Suspense>
    </section>
  );
}