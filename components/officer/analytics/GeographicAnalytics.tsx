"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { GeographicComparisonData } from "@/lib/services/officer/analytics";
import { getGeographicComparison } from "@/lib/services/officer/analytics";
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

function StatusPill({
  status,
}: {
  status: GeographicComparisonData["rows"][number]["status"];
}) {
  const tone =
    status === "above"
      ? "bg-danger-red/10 text-danger-red"
      : status === "below"
        ? "bg-teal/10 text-deep-navy"
        : "bg-gray-100 text-gray-600";
  const Icon =
    status === "above" ? ArrowUpRight : status === "below" ? ArrowDownRight : Minus;
  const label =
    status === "above"
      ? "Above state avg"
      : status === "below"
        ? "Below state avg"
        : "In line with avg";
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

export function GeographicAnalytics() {
  // Centralized Data Mode (live analytics has no endpoint yet → error state).
  const { mode } = useDataMode();
  const { status, data, error, retry } = useAnalyticsResource<GeographicComparisonData>(
    () =>
      resolveOfficerData(mode, {
        demo: () => getGeographicComparison(),
        live: () => getAnalyticsLive(),
      }),
    (result) => result.rows.length === 0,
    [mode],
  );

  if (status === "error") {
    return <AnalyticsErrorState message={error} onRetry={retry} />;
  }

  const maxRatio = Math.max(
    ...(data?.rows ?? []).map((r) => r.ratio ?? 0),
    1,
  );

  return (
    <AnalyticsPanel
      title="Geographic Comparison"
      description="Aggregate reports by LGA compared with the state average across compared areas."
      action={
        <span className="text-[11px] text-muted-foreground">
          {data?.stateLabel ?? "Osun State"}
        </span>
      }
      contentClassName="pt-2"
    >
      {status === "loading" ? (
        <AnalyticsPanelSkeleton rows={6} />
      ) : status === "empty" || !data ? (
        <AnalyticsEmptyState message="Geographic comparison data is currently below the privacy threshold." />
      ) : (
        <div className="flex min-w-0 flex-col">
          <ul className="flex flex-col" aria-label="LGA comparison">
            {data.rows.map((row) => (
              <li
                key={row.area}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-gray-50 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-deep-navy">
                    {row.area}
                  </p>
                  <div
                    className="mt-1.5 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-gray-100"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-primary-blue/60"
                      style={{
                        width: `${Math.max(
                          4,
                          Math.round(((row.ratio ?? 0) / maxRatio) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm font-semibold text-deep-navy">
                    {row.count === null
                      ? "Insufficient"
                      : row.count.toLocaleString()}
                  </span>
                  {row.count !== null && (
                    <span className="text-[10px] text-gray-400" title="vs state average">
                      {row.ratio !== null
                        ? `${Math.round(row.ratio * 100)}% of avg`
                        : ""}
                    </span>
                  )}
                </div>
                <div className="col-start-2 row-start-1 flex justify-end sm:col-start-3 sm:row-start-auto">
                  <StatusPill status={row.status} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-gray-400">
            Aggregate report count per LGA and its ratio to the {data.stateLabel}{" "}
            average. Suppressed below the privacy threshold when insufficient.
          </p>
        </div>
      )}
    </AnalyticsPanel>
  );
}