"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Eye,
  Layers,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/server/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ExplorerData,
  ExplorerFilters,
} from "@/lib/services/officer/explorer";
import {
  AGE_GROUP_LABELS,
  COMPARE_WITH_OPTIONS,
  REPORT_TYPE_LABELS,
  SEVERITY_LABELS,
  SEX_LABELS,
  TIME_RANGE_OPTIONS,
} from "@/lib/services/officer/explorer";

interface Props {
  data: ExplorerData;
  filters: ExplorerFilters;
  geo: { state: string; lga: string };
  onApplyFilters: (next: ExplorerFilters) => void;
  onClearAll: () => void;
}
function removeChip(key: string, current: ExplorerFilters): ExplorerFilters {
  switch (key) {
    case "lga":
      return { ...current, lgaId: "" };
    case "symptom":
      return { ...current, symptom: "" };
    case "condition":
      return { ...current, healthCondition: "" };
    case "age":
      return { ...current, ageGroup: "all" };
    case "sex":
      return { ...current, sex: "all" };
    case "severity":
      return { ...current, severity: "all" };
    case "reportType":
      return { ...current, reportType: "all" };
    default:
      return current;
  }
}

function getActiveChips(
  filters: ExplorerFilters,
  geo: { state: string; lga: string },
) {
  const chips: { key: string; label: string; value: string; removable: boolean }[] = [];

  chips.push({
    key: "state",
    label: "State",
    value: geo.state || filters.stateId,
    removable: false,
  });
  if (filters.lgaId) {
    chips.push({
      key: "lga",
      label: "LGA",
      value: geo.lga || filters.lgaId,
      removable: true,
    });
  }
  if (filters.symptom) {
    chips.push({ key: "symptom", label: "Symptom", value: filters.symptom, removable: true });
  }
  if (filters.healthCondition) {
    chips.push({ key: "condition", label: "Condition", value: filters.healthCondition, removable: true });
  }
  if (filters.ageGroup !== "all") {
    chips.push({ key: "age", label: "Age", value: AGE_GROUP_LABELS[filters.ageGroup], removable: true });
  }
  if (filters.sex !== "all") {
    chips.push({ key: "sex", label: "Sex", value: SEX_LABELS[filters.sex], removable: true });
  }
  if (filters.severity !== "all") {
    chips.push({ key: "severity", label: "Severity", value: SEVERITY_LABELS[filters.severity], removable: true });
  }
  if (filters.reportType !== "all") {
    chips.push({ key: "reportType", label: "Report type", value: REPORT_TYPE_LABELS[filters.reportType], removable: true });
  }
  chips.push({
    key: "timeRange",
    label: "Time range",
    value:
      TIME_RANGE_OPTIONS.find((o) => o.value === filters.timeRange)?.label ??
      filters.timeRange,
    removable: false,
  });
  if (filters.compareWith && filters.compareWith !== "none") {
    chips.push({
      key: "compare",
      label: "Compare with",
      value:
        COMPARE_WITH_OPTIONS.find((o) => o.value === filters.compareWith)?.label ??
        filters.compareWith,
      removable: false,
    });
  }

  return chips;
}

const STATS: ReadonlyArray<{
  key: "groups" | "signals" | "elevated" | "review";
  label: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}> = [
  {
    key: "groups",
    label: "Signal groups",
    icon: Layers,
    iconBg: "bg-primary-blue/10",
    iconColor: "text-primary-blue",
  },
  {
    key: "signals",
    label: "Aggregate signals",
    icon: Activity,
    iconBg: "bg-teal/10",
    iconColor: "text-teal",
  },
  {
    key: "elevated",
    label: "Elevated activity",
    icon: TrendingUp,
    iconBg: "bg-danger-red/10",
    iconColor: "text-danger-red",
  },
  {
    key: "review",
    label: "Requires review",
    icon: Eye,
    iconBg: "bg-warning-amber/10",
    iconColor: "text-warning-amber",
  },
];

export function ExplorerQuerySummary({
  data,
  filters,
  geo,
  onApplyFilters,
  onClearAll,
}: Props) {
  const chips = getActiveChips(filters, geo);
  const removableChips = chips.filter((chip) => chip.removable);
  const suppressedCount = data.groups.filter(
    (g) => g.dataSufficiency === "insufficient",
  ).length;

  const values: Record<(typeof STATS)[number]["key"], number> = {
    groups: data.summary.signalGroups,
    signals: data.summary.aggregateSignals,
    elevated: data.summary.elevated,
    review: data.summary.requiresReview,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map(({ key, label, icon: Icon, iconBg, iconColor }) => (
          <Card
            key={key}
            className="h-full rounded-xl border border-border shadow-sm"
          >
            <CardContent className="p-4">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  iconBg,
                )}
              >
                <Icon className={cn("h-4 w-4", iconColor)} aria-hidden="true" />
              </span>
              <p className="mt-3 text-2xl font-bold leading-none text-deep-navy">
                {values[key].toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.summary.comparison && (
        <p
          className={
            data.summary.comparison.changePct === null
              ? "inline-flex w-fit items-center gap-1.5 rounded-full border border-warning-amber/30 bg-warning-amber/10 px-2.5 py-1 text-xs font-medium text-warning-amber"
              : "inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-deep-navy"
          }
          role="note"
          aria-label="Comparison with prior period"
        >
          <span className="font-medium">Compare with {data.summary.comparison.label}:</span>
          {data.summary.comparison.changePct === null ? (
            <span>insufficient data for comparison</span>
          ) : (
            <span>
              {data.summary.comparison.changePct >= 0 ? "up" : "down"}{" "}
              {Math.abs(data.summary.comparison.changePct)}% vs{" "}
              {(data.summary.comparison.previousAggregate ?? 0).toLocaleString()}{" "}
              aggregate
            </span>
          )}
        </p>
      )}

      {suppressedCount > 0 && (
        <p
          className="text-[10px] text-warning-amber"
          role="note"
          aria-label="Suppressed groups note"
        >
          {suppressedCount} signal group{suppressedCount === 1 ? "" : "s"} below
          the privacy threshold - aggregate counts exclude suppressed groups.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-deep-navy"
          >
            <span className="font-medium">{chip.label}:</span>
            <span className="text-gray-600">{chip.value}</span>
            {chip.removable && (
              <button
                type="button"
                onClick={() => onApplyFilters(removeChip(chip.key, filters))}
                aria-label={`Remove ${chip.label} filter`}
                className="ml-0.5 rounded-full p-0.5 text-gray-400 outline-none transition-colors hover:bg-gray-100 hover:text-deep-navy focus-visible:ring-2 focus-visible:ring-primary-blue/60"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        {removableChips.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-primary-blue hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}