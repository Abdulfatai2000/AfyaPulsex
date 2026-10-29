"use client";

import type { DemographicAnalytics as DemographicAnalyticsData } from "@/lib/services/officer/analytics";
import { getDemographicAnalytics } from "@/lib/services/officer/analytics";
import { resolveOfficerData } from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getAnalyticsLive } from "@/lib/services/officer/live-adapters";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { useAnalyticsResource } from "./useAnalyticsResource";
import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  AnalyticsPanelSkeleton,
} from "./AnalyticsStates";

function SplitSection({
  title,
  buckets,
}: {
  title: string;
  buckets: ReadonlyArray<{ label: string; count: number | null }>;
}) {
  const total = buckets.reduce((sum, b) => sum + (b.count ?? 0), 0);

  return (
    <section
      className="rounded-lg border border-gray-100 p-3"
      aria-label={title}
    >
      <h3 className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
        {title}
      </h3>
      <ul className="mt-3 flex flex-col gap-3" aria-label={`${title} distribution`}>
        {buckets.map((bucket) => {
          const share = bucket.count === null ? 0 : Math.round(((bucket.count ?? 0) / total) * 100);
          return (
            <li key={bucket.label}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-gray-600">{bucket.label}</span>
                <span className="shrink-0">
                  {bucket.count === null ? (
                    <span className="text-[11px] text-warning-amber">
                      Insufficient
                    </span>
                  ) : (
                    <span className="font-medium text-deep-navy">
                      {bucket.count.toLocaleString()}
                      <span className="ml-1 text-[10px] text-gray-400">({share}%)</span>
                    </span>
                  )}
                </span>
              </div>
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100"
                aria-hidden="true"
              >
                {bucket.count !== null && (
                  <div
                    className="h-2 rounded-full bg-primary-blue/70"
                    style={{ width: `${Math.max(4, share)}%` }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DemographicAnalytics() {
  // Centralized Data Mode (live analytics has no endpoint yet → error state).
  const { mode } = useDataMode();
  const { status, data, error, retry } = useAnalyticsResource<DemographicAnalyticsData>(
    () =>
      resolveOfficerData(mode, {
        demo: () => getDemographicAnalytics(),
        live: () => getAnalyticsLive(),
      }),
    (result) =>
      result.ageGroups.length === 0 ||
      result.sexes.length === 0 ||
      result.channels.length === 0,
    [mode],
  );

  return (
    <AnalyticsPanel
      title="Demographics"
      description={`Aggregate demographic split across ${data?.total.toLocaleString() ?? "—"} reports for this window.`}
      action={
        <span className="text-[11px] text-muted-foreground">Last 14 days</span>
      }
      contentClassName="pt-2"
    >
      {status === "error" ? (
        <AnalyticsErrorState message={error} onRetry={retry} />
      ) : status === "empty" ? (
        <AnalyticsEmptyState message="Aggregate demographic splits are currently below the privacy threshold." />
      ) : data ? (
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SplitSection title="By age group" buckets={data.ageGroups} />
          <SplitSection title="By sex" buckets={data.sexes} />
          <SplitSection title="By reporting channel" buckets={data.channels} />
        </div>
      ) : (
        <AnalyticsPanelSkeleton rows={4} />
      )}
    </AnalyticsPanel>
  );
}