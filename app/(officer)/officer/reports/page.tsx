import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import ReportsCenterClient from "@/components/officer/reports/ReportsCenterClient";

function ReportsFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <div className="flex min-w-0 gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white p-1">
        <Skeleton className="h-8 w-32 flex-none rounded-lg" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-8 w-36 flex-none rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Reports & Export"
        description="Generate and export standard reports for your jurisdiction — daily summaries, LGA analysis, trends, investigations, and responses. Reports contain aggregate public-health indicators only, never individual records."
      />
      <Suspense fallback={<ReportsFallback />}>
        <ReportsCenterClient />
      </Suspense>
    </section>
  );
}