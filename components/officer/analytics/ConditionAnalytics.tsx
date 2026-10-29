"use client";

import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from "lucide-react";
import type { ConditionAggregate } from "@/lib/services/officer/analytics";
import {
  CONDITION_ACTIVITY_LABELS,
  getConditionAnalytics,
} from "@/lib/services/officer/analytics";
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

function ActivityPill({ activity }: { activity: ConditionAggregate["activity"] }) {
  const tone =
    activity === "elevated"
      ? "bg-danger-red/10 text-danger-red"
      : activity === "monitoring"
        ? "bg-warning-amber/10 text-warning-amber"
        : "bg-teal/10 text-deep-navy";
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {activity === "elevated" ? (
        <TrendingUp className="h-3 w-3" aria-hidden="true" />
      ) : null}
      {CONDITION_ACTIVITY_LABELS[activity]}
    </span>
  );
}

function ChangeLabel({ changePct }: { changePct: number | null }) {
  if (changePct === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <Minus className="h-3 w-3" aria-hidden="true" />
        n/a
      </span>
    );
  }
  const up = changePct > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? "text-danger-red" : "text-success-green"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {up ? "+" : ""}
      {changePct}%
    </span>
  );
}

function barPct(count: number | null, max: number): number {
  if (count === null || max <= 0) {
    return 0;
  }
  return Math.max(6, Math.round((count / max) * 100));
}

export function ConditionAnalytics() {
  // Centralized Data Mode (live analytics has no endpoint yet → error state).
  const { mode } = useDataMode();
  const { status, data, error, retry } = useAnalyticsResource<ConditionAggregate[]>(
    () =>
      resolveOfficerData(mode, {
        demo: () => getConditionAnalytics(),
        live: () => getAnalyticsLive(),
      }),
    (items) => items.length === 0,
    [mode],
  );

  if (status === "error") {
    return <AnalyticsErrorState message={error} onRetry={retry} />;
  }

  const max = Math.max(...(data ?? []).map((c) => c.count ?? 0), 1);

  return (
    <AnalyticsPanel
      title="Conditions"
      description="Aggregate reports grouped by health condition — Never clinical diagnosis."
      action={
        <span className="text-[11px] text-muted-foreground">Last 14 days</span>
      }
      contentClassName="pt-2"
    >
      {status === "loading" ? (
        <AnalyticsPanelSkeleton rows={6} />
      ) : status === "empty" || !data ? (
        <AnalyticsEmptyState message="No condition aggregates were found for this window." />
      ) : (
        <ol className="flex flex-col" aria-label="Condition aggregates">
          {data.map((condition) => (
            <li
              key={condition.rank}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-gray-50 py-3 last:border-0"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-blue/10 text-[11px] font-semibold text-primary-blue"
                aria-hidden="true"
              >
                {condition.rank}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-deep-navy">
                    {condition.condition}
                  </p>
                  <ActivityPill activity={condition.activity} />
                </div>
                <div
                  className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-primary-blue/60"
                    style={{ width: `${barPct(condition.count, max)}%` }}
                  />
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:gap-0">
                <span className="text-sm font-semibold text-deep-navy">
                  {condition.count === null
                    ? "Insufficient"
                    : condition.count.toLocaleString()}
                </span>
                <ChangeLabel changePct={condition.changePct} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </AnalyticsPanel>
  );
}