import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getSimulationPermission } from "@/lib/services/officer/simulation";
import SimulationCenterClient from "@/components/officer/simulation/SimulationCenterClient";

function SimulationFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32 rounded-full" />
        </div>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
      <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-white p-4 lg:flex-row lg:items-start lg:gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <Skeleton className="size-10 flex-none rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}

export default async function SimulationPage() {
  // Simulation capability (and any scope the backend attaches) is
  // backend-provided; the page consumes it at the boundary and renders the
  // demo flow OR a permission-denied state accordingly. No role-name
  // heuristics live in the UI.
  const permission = await getSimulationPermission();

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Health Event Simulation (Demo)"
        description="Use simulated data to explore how AfyaPulse detects and responds to health events."
      />
      <Suspense fallback={<SimulationFallback />}>
        <SimulationCenterClient initialPermission={permission} />
      </Suspense>
    </section>
  );
}
