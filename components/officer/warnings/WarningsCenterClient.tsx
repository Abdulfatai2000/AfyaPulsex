"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  EarlyWarning,
  WarningDataStatus,
  WarningFilters,
  WarningSummaryCounts,
} from "@/lib/services/officer/warnings";
import {
  DEFAULT_FILTERS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  TIME_RANGE_OPTIONS,
  deriveWarningStatus,
  getWarningSummary,
  getWarnings,
} from "@/lib/services/officer/warnings";
import { resolveOfficerData } from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getWarningsLive } from "@/lib/services/officer/live-adapters";
import { WarningSummary } from "./WarningSummary";
import { WarningFilters as WarningFiltersPanel } from "./WarningFilters";
import { WarningList } from "./WarningList";

const VALID_STATUSES: ReadonlyArray<WarningFilters["status"]> = [
  "new",
  "monitoring",
  "requires-review",
  "escalated",
  "closed",
];

function mapStatusParam(value: string | null): WarningFilters["status"] {
  return VALID_STATUSES.includes(value as WarningFilters["status"])
    ? (value as WarningFilters["status"])
    : "all";
}

function getActiveChips(filters: WarningFilters) {
  const chips: { key: string; label: string; value: string }[] = [];

  if (filters.status !== "all") {
    chips.push({
      key: "status",
      label: "Status",
      value: STATUS_LABELS[filters.status],
    });
  }
  if (filters.state) {
    chips.push({ key: "state", label: "State", value: filters.state });
  }
  if (filters.lga) {
    chips.push({ key: "lga", label: "LGA", value: filters.lga });
  }
  if (filters.healthCondition) {
    chips.push({
      key: "condition",
      label: "Condition",
      value: filters.healthCondition,
    });
  }
  if (filters.severity !== "all") {
    chips.push({
      key: "severity",
      label: "Severity",
      value: SEVERITY_LABELS[filters.severity],
    });
  }
  if (filters.search.trim()) {
    chips.push({
      key: "search",
      label: "Search",
      value: filters.search.trim(),
    });
  }
  chips.push({
    key: "timeRange",
    label: "Period",
    value:
      TIME_RANGE_OPTIONS.find((o) => o.value === filters.timeRange)?.label ??
      filters.timeRange,
  });

  return chips;
}

export default function WarningsCenterClient() {
  const { mode } = useDataMode();
  const searchParams = useSearchParams();
  const requestedStatus = mapStatusParam(searchParams.get("status"));

  const [filters, setFilters] = useState<WarningFilters>(() => ({
    ...DEFAULT_FILTERS,
    state: mode === "live" ? "" : DEFAULT_FILTERS.state,
    status: requestedStatus,
  }));
  const [warnings, setWarnings] = useState<EarlyWarning[]>([]);
  const [status, setStatus] = useState<WarningDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WarningSummaryCounts | null>(null);

  const load = useCallback(
    (next: WarningFilters) => {
      // Live uses only authorized, privacy-safe server results.
      resolveOfficerData(mode, {
        demo: () => getWarnings(next),
        live: () => getWarningsLive(next),
      })
        .then((data) => {
          setWarnings(data);
          setFilters(next);
          if (mode === "live")
            setSummary({
              active: data.length,
              requiresReview: data.length,
              monitoring: 0,
              escalated: 0,
            });
          setStatus(deriveWarningStatus(data));
          setError(null);
        })
        .catch((err: unknown) => {
          setStatus("error");
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong loading warnings.",
          );
        });
    },
    [mode],
  );

  // Load the initial view (honours ?status=...) and the summary counts. All
  // state updates happen inside async callbacks rather than the effect body.
  useEffect(() => {
    void load({
      ...DEFAULT_FILTERS,
      state: mode === "live" ? "" : DEFAULT_FILTERS.state,
      status: requestedStatus,
    });
  }, [load, mode, requestedStatus]);

  useEffect(() => {
    let cancelled = false;
    if (mode !== "demo") return;
    void getWarningSummary()
      .then((counts) => {
        if (!cancelled) {
          setSummary(counts);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const handleApply = () => {
    setStatus("loading");
    void load(filters);
  };

  const handleReset = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      state: mode === "live" ? "" : DEFAULT_FILTERS.state,
    });
    setStatus("loading");
    void load({
      ...DEFAULT_FILTERS,
      state: mode === "live" ? "" : DEFAULT_FILTERS.state,
    });
  };

  const activeChips = useMemo(() => getActiveChips(filters), [filters]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {summary ? (
        <WarningSummary counts={summary} />
      ) : (
        <div
          className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4"
          aria-hidden="true"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      <WarningFiltersPanel
        value={filters}
        onChange={setFilters}
        onApply={handleApply}
        onReset={handleReset}
      />

      <div className="flex flex-wrap items-center gap-2">
        {activeChips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-deep-navy"
          >
            <span className="font-medium">{chip.label}:</span>
            <span className="text-muted-foreground">{chip.value}</span>
          </span>
        ))}
        {activeChips.length > 1 && (
          <button
            type="button"
            onClick={handleReset}
            className="rounded text-xs font-medium text-primary-blue outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary-blue/60"
          >
            Clear all
          </button>
        )}
      </div>

      <WarningList
        warnings={warnings}
        status={status}
        error={error}
        onRetry={handleApply}
        onReset={handleReset}
      />
    </div>
  );
}
