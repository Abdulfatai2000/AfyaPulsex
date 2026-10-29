"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { OfficerMapScope } from "@/lib/services/officer/map-scope";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import type {
  MapFilters,
  MapZone,
  MapDataStatus,
} from "@/lib/services/officer/map";
import {
  DEFAULT_FILTERS,
  deriveMapStatus,
  MapServiceError,
  TIME_RANGE_OPTIONS,
  AGE_GROUP_LABELS,
  SEX_LABELS,
  SEVERITY_LABELS,
  REPORT_TYPE_LABELS,
} from "@/lib/services/officer/map";
import { geographyService } from "@/lib/services/officer/geography";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { useOfficerProfile } from "@/components/layout/officer/OfficerProfileContext";
import { getOfficerDemoMapAction } from "@/server/actions/officer/demo-data";
import { getMapDataLive } from "@/lib/services/officer/live-adapters";
import { MapFilters as MapFiltersPanel } from "@/components/officer/map/MapFilters";
import { MapLegend } from "@/components/officer/map/MapLegend";
import { MapSummaryPanel } from "@/components/officer/map/MapSummaryPanel";
import { Button } from "@/components/ui/button";
import { Filter, X, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const SignalMap = dynamic(
  () =>
    import("@/components/officer/map/SignalMap").then((mod) => mod.SignalMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-gray-100 animate-pulse">
        <p className="text-sm text-gray-400">Loading map...</p>
      </div>
    ),
  },
);

function CenteredState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-2 rounded-xl border border-gray-200 bg-white p-4">
      {icon}
      <p className="text-sm font-semibold text-[#08214A]">{title}</p>
      <p className="max-w-md text-xs text-gray-500">{description}</p>
      {action}
    </div>
  );
}

function getActiveFilters(
  filters: MapFilters,
  geo: { state: string; lga: string },
) {
  const rows: { key: string; label: string; value: string }[] = [];

  if (filters.stateId) {
    rows.push({
      key: "state",
      label: "State",
      value: geo.state || filters.stateId,
    });
  }
  if (filters.lgaId) {
    rows.push({ key: "lga", label: "LGA", value: geo.lga || filters.lgaId });
  }
  if (filters.symptom) {
    rows.push({ key: "symptom", label: "Symptom", value: filters.symptom });
  }
  if (filters.healthCondition) {
    rows.push({
      key: "condition",
      label: "Condition",
      value: filters.healthCondition,
    });
  }
  if (filters.ageGroup !== "all") {
    rows.push({
      key: "age",
      label: "Age",
      value: AGE_GROUP_LABELS[filters.ageGroup],
    });
  }
  if (filters.sex !== "all") {
    rows.push({ key: "sex", label: "Sex", value: SEX_LABELS[filters.sex] });
  }
  if (filters.severity !== "all") {
    rows.push({
      key: "severity",
      label: "Severity",
      value: SEVERITY_LABELS[filters.severity],
    });
  }
  if (filters.reportType !== "all") {
    rows.push({
      key: "reportType",
      label: "Report type",
      value: REPORT_TYPE_LABELS[filters.reportType],
    });
  }
  rows.push({
    key: "timeRange",
    label: "Time range",
    value:
      TIME_RANGE_OPTIONS.find((o) => o.value === filters.timeRange)?.label ??
      filters.timeRange,
  });

  return rows;
}

export default function MapPageClient({ scope }: { scope: OfficerMapScope }) {
  const defaults = useMemo(
    () => ({ ...DEFAULT_FILTERS, stateId: scope.stateId, lgaId: scope.lgaId }),
    [scope.stateId, scope.lgaId],
  );
  const requestId = useRef(0);
  const { mode } = useDataMode();
  const [filters, setFilters] = useState(defaults);
  const [zones, setZones] = useState<MapZone[]>([]);
  const [status, setStatus] = useState<MapDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Resolve the selected ids to display names for the jurisdiction header and
  // the active-filter chips (data-driven through the geography service).
  const [geoLabels, setGeoLabels] = useState<{ state: string; lga: string }>({
    state: filters.stateId,
    lga: filters.lgaId,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      filters.stateId
        ? geographyService.getStateById(filters.stateId)
        : Promise.resolve(null),
      filters.lgaId
        ? geographyService.getLgaById(filters.lgaId)
        : Promise.resolve(null),
    ])
      .then(([state, lga]) => {
        if (!cancelled) {
          setGeoLabels({
            state: state?.name ?? filters.stateId,
            lga: lga?.name ?? filters.lgaId,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeoLabels({ state: filters.stateId, lga: filters.lgaId });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filters.stateId, filters.lgaId]);

  const { profile } = useOfficerProfile();

  const jurisdiction = profile?.jurisdiction || "Your Jurisdiction";

  const fetchData = useCallback(
    async (next: MapFilters) => {
      const currentRequest = ++requestId.current;
      setStatus("loading");
      setZones([]);
      setSelectedZone(null);
      setError(null);
      try {
        // Centralized Data Mode: demo service or live backend, never mixed and
        // never a silent demo fallback when live fails.
        const data = await resolveOfficerData(mode, {
          demo: () => getOfficerDemoMapAction(next),
          live: () => getMapDataLive(next),
        });
        if (currentRequest !== requestId.current) return;
        setZones(data);
        setStatus(deriveMapStatus(data));
      } catch (err) {
        if (currentRequest !== requestId.current) return;
        const mapped = mapFetchErrorStatus(err, MapServiceError);
        setStatus(mapped === "unauthorized" ? "unauthorized" : "error");
        setError((err as Error)?.message ?? "Something went wrong.");
      }
    },
    [mode],
  );

  // Clear the previous mode immediately and ignore requests finishing after a switch.
  useEffect(() => {
    setFilters(defaults);
    void fetchData(defaults);
    return () => {
      requestId.current += 1;
    };
  }, [fetchData, defaults]);

  const handleApply = () => {
    setFiltersOpen(false);
    void fetchData(filters);
  };

  const handleReset = () => {
    setFilters(defaults);
    void fetchData(defaults);
  };

  const activeChips = useMemo(
    () => getActiveFilters(filters, geoLabels),
    [filters, geoLabels],
  );

  const showMap = status === "ready";

  return (
    <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:gap-4 overflow-x-hidden">
      {/* Desktop left: filter panel */}
      <aside className="hidden w-72 min-w-0 flex-shrink-0 flex-col gap-4 overflow-y-auto 2xl:flex 2xl:w-72">
        <MapFiltersPanel
          scope={scope}
          value={filters}
          onChange={setFilters}
          onApply={handleApply}
          onReset={handleReset}
        />
      </aside>

      {/* Center: map and active filters */}
      <section className="flex min-w-0 flex-col gap-3 2xl:flex-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#08214A]">
            Live signal heat map
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="2xl:hidden"
            onClick={() => setFiltersOpen(true)}
            aria-label="Open filters"
            aria-expanded={filtersOpen}
            type="button"
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="ml-1.5 text-xs">Filters</span>
          </Button>
        </div>

        {/* Active filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-[#08214A]"
            >
              <span className="font-medium">{chip.label}:</span>
              <span className="text-gray-600">{chip.value}</span>
            </span>
          ))}
          {activeChips.length > 1 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-[#1267E8] hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Map + state container. Explicit height at every breakpoint. */}
        <div className="relative min-w-0 h-[400px] sm:h-[500px] xl:h-[600px] w-full">
          <SignalMap
            dataMode={mode}
            viewport={scope.viewport}
            zones={zones}
            selectedZone={selectedZone}
            onSelect={setSelectedZone}
          />
        </div>
        {!scope.viewport.exactBoundary && (
          <p className="text-gray-500">
            Boundary data is unavailable. The map uses an administrative
            reference viewport with panning disabled; data remains restricted to{" "}
            {scope.label}.
          </p>
        )}
      </section>

      {/* Right on desktop; below the map on smaller screens. */}
      <aside
        aria-label="Map status and activity legend"
        className="flex min-w-0 flex-col gap-4 2xl:sticky 2xl:top-4 2xl:w-64 2xl:shrink-0"
      >
        {status === "loading" && (
          <p role="status">Loading aggregate signals...</p>
        )}
        <div aria-live="polite">
          {status === "empty" && (
            <CenteredState
              icon={<X className="h-5 w-5 text-gray-400" />}
              title="No signals match your filters"
              description="No publishable aggregate signals are available for this selection. Data may be absent or withheld by the consent/privacy policy."
              action={
                <Button size="sm" variant="outline" onClick={handleReset}>
                  Reset filters
                </Button>
              }
            />
          )}

          {status === "privacy" && (
            <CenteredState
              icon={<X className="h-5 w-5 text-[#D99000]" />}
              title="Insufficient aggregated data"
              description="The selected filters produced result buckets below the privacy aggregation threshold. Broaden your filters to reveal aggregated zone activity."
              action={
                <Button size="sm" variant="outline" onClick={handleReset}>
                  Reset filters
                </Button>
              }
            />
          )}

          {status === "unauthorized" && (
            <CenteredState
              icon={<X className="h-5 w-5 text-[#C63C3C]" />}
              title="Jurisdiction access restricted"
              description={
                error ??
                "You are not authorized to view data for the selected jurisdiction."
              }
              action={
                <Button size="sm" variant="outline" onClick={handleReset}>
                  Return to authorized area
                </Button>
              }
            />
          )}

          {status === "error" && (
            <CenteredState
              icon={<RefreshCw className="h-5 w-5 text-[#C63C3C]" />}
              title="Unable to load map data"
              description={
                error ??
                "A network or backend error occurred. Please try again."
              }
              action={
                <Button size="sm" variant="outline" onClick={handleApply}>
                  Retry
                </Button>
              }
            />
          )}
        </div>
        <MapLegend />
        {showMap && (
          <MapSummaryPanel
            selectedZone={selectedZone}
            jurisdiction={jurisdiction}
          />
        )}
      </aside>

      {/* Mobile/tablet filter bottom sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <MapFiltersPanel
          scope={scope}
          value={filters}
          onChange={setFilters}
          onApply={handleApply}
          onReset={handleReset}
        />
      </Sheet>
    </div>
  );
}

function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>Signal map filters</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
