import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { isValidDashboardTimeframe } from "@/lib/services/officer/dashboard";
import OverviewDashboard from "@/components/officer/overview/OverviewDashboard";
import OfficerMetricCards from "@/components/officer/overview/OfficerMetricCards";
import HealthActivityMapPreview from "@/components/officer/overview/HealthActivityMapPreview";
import TopSymptoms from "@/components/officer/overview/TopSymptoms";
import RecentAlerts from "@/components/officer/overview/RecentAlerts";
import WhatChangedToday from "@/components/officer/overview/WhatChangedToday";
import { getOfficerProfileAction } from "@/server/actions/officer/profile";
import { getServerDataMode } from "@/lib/services/officer/data-mode-server";

// Greeting identity always comes from the authenticated session/profile
// boundary (never the demo mock) so the header shows the real logged-in
// officer. Jurisdiction/widgets below still follow the centralized Data Mode.

function MetricCardsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ timeframe?: string }>;
}) {
  const params = await searchParams;
  const timeframe = isValidDashboardTimeframe(params?.timeframe)
    ? params.timeframe
    : "7d";
  let profile: { name: string; jurisdiction?: string };
  try {
    profile = await getOfficerProfileAction();
  } catch (err) {
    // Preserve Next.js redirects (unauthenticated → /auth); only fall back
    // to the generic label when the name itself is unavailable.
    if (
      err instanceof Error &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (err as { digest: string }).digest.startsWith("NEXT_HTTP_ERROR"))
    ) {
      throw err;
    }
    profile = { name: "Officer", jurisdiction: undefined };
  }
  // Centralized Data Mode (session cookie): every widget below reads through
  // the same mode so Demo/Live is consistent across the page.
  const mode = await getServerDataMode();

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <OverviewDashboard
        officerName={profile.name}
        jurisdiction={profile.jurisdiction}
        timeframe={timeframe}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <Suspense fallback={<MetricCardsSkeleton />}>
            <OfficerMetricCards timeframe={timeframe} mode={mode} />
          </Suspense>

          <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <Suspense
                fallback={<Skeleton className="h-72 w-full rounded-xl" />}
              >
                <HealthActivityMapPreview timeframe={timeframe} mode={mode} />
              </Suspense>
            </div>
            <div className="min-w-0">
              <Suspense
                fallback={<Skeleton className="h-72 w-full rounded-xl" />}
              >
                <TopSymptoms timeframe={timeframe} mode={mode} />
              </Suspense>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <Suspense
                fallback={<Skeleton className="h-64 w-full rounded-xl" />}
              >
                <RecentAlerts mode={mode} />
              </Suspense>
            </div>
            <div className="min-w-0 lg:col-span-2">
              <Suspense
                fallback={<Skeleton className="h-64 w-full rounded-xl" />}
              >
                <WhatChangedToday mode={mode} />
              </Suspense>
            </div>
          </div>
        </div>
      </OverviewDashboard>
    </section>
  );
}