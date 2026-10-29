"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ExplorerData,
  ExplorerDataStatus,
  ExplorerFilters,
} from "@/lib/services/officer/explorer";
import {
  DEFAULT_FILTERS,
  ExplorerServiceError,
  TIME_RANGE_OPTIONS,
  deriveExplorerStatus,
} from "@/lib/services/officer/explorer";
import { geographyService } from "@/lib/services/officer/geography";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getOfficerDemoExplorerAction } from "@/server/actions/officer/demo-data";
import { getExplorerDataLive } from "@/lib/services/officer/live-adapters";
import {
  deleteSavedQuery,
  listSavedQueries,
  saveExplorerQuery,
  type SavedExplorerQuery,
} from "@/lib/services/officer/saved-queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExplorerFilters as ExplorerFiltersPanel } from "@/components/officer/explorer/ExplorerFilters";
import { ExplorerQuerySummary } from "@/components/officer/explorer/ExplorerQuerySummary";
import { ExplorerResults } from "@/components/officer/explorer/ExplorerResults";
import { ExplorerTrendChart } from "@/components/officer/explorer/ExplorerTrendChart";
import { ExplorerDemographics } from "@/components/officer/explorer/ExplorerDemographics";
import { ExplorerRelatedSymptoms } from "@/components/officer/explorer/ExplorerRelatedSymptoms";
import { ExplorerSavedQueries } from "@/components/officer/explorer/ExplorerSavedQueries";

interface Props {
  /** URL seeds (?stateId, ?lgaId); validated by the explorer service. */
  defaultStateId?: string;
  defaultLgaId?: string;
}

export default function ExplorerPageClient({
  defaultStateId,
  defaultLgaId,
}: Props) {
  const { mode, accountId } = useDataMode();
  const isDemo = mode === "demo";
  const storeScope = { accountId, isDemo };
  const [activeTab, setActiveTab] = useState<"build" | "saved">("build");
  const [filters, setFilters] = useState<ExplorerFilters>(() => {
    if (defaultStateId) {
      return {
        ...DEFAULT_FILTERS,
        stateId: defaultStateId,
        lgaId: defaultLgaId ?? "",
      };
    }
    return defaultLgaId
      ? { ...DEFAULT_FILTERS, lgaId: defaultLgaId }
      : DEFAULT_FILTERS;
  });
  const [status, setStatus] = useState<ExplorerDataStatus>("loading");
  const [data, setData] = useState<ExplorerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedExplorerQuery[]>(() =>
    listSavedQueries(storeScope),
  );

  // Resolve the selected ids to display names for chips/descriptions
  // (data-driven through the geography service, mirroring the Signal Map
  // client).
  const [geo, setGeo] = useState<{ state: string; lga: string }>({
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
          setGeo({
            state: state?.name ?? filters.stateId,
            lga: lga?.name ?? filters.lgaId,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeo({ state: filters.stateId, lga: filters.lgaId });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filters.stateId, filters.lgaId]);

  // Initial load. State updates happen only inside promise handlers (never
  // synchronously in the effect body), so initial UI is already "loading".
  // The route remounts this client on Data Mode switches via `key`, so the
  // mount fetch always uses the active mode.
  const initialFilters = useRef(filters);
  const initialMode = useRef(mode);

  useEffect(() => {
    let cancelled = false;
    void resolveOfficerData(initialMode.current, {
      demo: () => getOfficerDemoExplorerAction(initialFilters.current),
      live: () => getExplorerDataLive(),
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setData(result);
        setStatus(deriveExplorerStatus(result.groups));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setData(null);
        const mapped = mapFetchErrorStatus(err, ExplorerServiceError);
        setStatus(mapped === "unauthorized" ? "unauthorized" : "error");
        setError((err as Error)?.message ?? "Something went wrong.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runQuery = useCallback(
    async (next: ExplorerFilters) => {
      try {
        const result = await resolveOfficerData(mode, {
          demo: () => getOfficerDemoExplorerAction(next),
          live: () => getExplorerDataLive(),
        });
        setData(result);
        setStatus(deriveExplorerStatus(result.groups));
        setError(null);
      } catch (err) {
        setData(null);
        const mapped = mapFetchErrorStatus(err, ExplorerServiceError);
        setStatus(mapped === "unauthorized" ? "unauthorized" : "error");
        setError((err as Error)?.message ?? "Something went wrong.");
      }
    },
    [mode],
  );

  const handleSearch = () => {
    setStatus("loading");
    setData(null);
    void runQuery(filters);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setStatus("loading");
    setData(null);
    void runQuery(DEFAULT_FILTERS);
  };

  const handleApplyFilters = (next: ExplorerFilters) => {
    setFilters(next);
    setStatus("loading");
    setData(null);
    void runQuery(next);
  };

  const describeFilters = (next: ExplorerFilters): string => {
    const rangeLabel =
      TIME_RANGE_OPTIONS.find((o) => o.value === next.timeRange)?.label ??
      next.timeRange;
    const area = next.lgaId ? geo.lga || next.lgaId : geo.state || next.stateId;
    return `${area} · ${rangeLabel}`;
  };

  const handleSaveQuery = async (name: string): Promise<boolean> => {
    saveExplorerQuery({ name, description: describeFilters(filters), filters }, storeScope);
    setSavedQueries(listSavedQueries(storeScope));
    return true;
  };

  const handleRunSaved = (query: SavedExplorerQuery) => {
    setActiveTab("build");
    setFilters(query.filters);
    setStatus("loading");
    setData(null);
    void runQuery(query.filters);
  };

  const handleDeleteSaved = (id: string) => {
    deleteSavedQuery(id, storeScope);
    setSavedQueries(listSavedQueries(storeScope));
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value === "saved" ? "saved" : "build")
        }
      >
        <TabsList variant="line">
          <TabsTrigger value="build">Build Query</TabsTrigger>
          <TabsTrigger value="saved">Saved Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="mt-4">
          <div className="flex min-w-0 flex-col gap-4">
            <ExplorerFiltersPanel
              value={filters}
              onChange={setFilters}
              onSearch={handleSearch}
              onReset={handleReset}
              onSaveQuery={handleSaveQuery}
            />

            {status === "ready" && data ? (
              <div className="flex min-w-0 flex-col gap-4">
                <ExplorerQuerySummary
                  data={data}
                  filters={filters}
                  geo={geo}
                  onApplyFilters={handleApplyFilters}
                  onClearAll={handleReset}
                />
                <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <ExplorerResults
                      status={status}
                      data={data}
                      error={error}
                      onReset={handleReset}
                      onRetry={handleSearch}
                    />
                  </div>
                  <aside className="flex min-w-0 flex-col gap-4">
                    <ExplorerTrendChart trend={data.trend} />
                    <ExplorerDemographics demographics={data.demographics} />
                    <ExplorerRelatedSymptoms symptoms={data.relatedSymptoms} />
                  </aside>
                </div>
              </div>
            ) : (
              <ExplorerResults
                status={status}
                data={data}
                error={error}
                onReset={handleReset}
                onRetry={handleSearch}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <ExplorerSavedQueries
            queries={savedQueries}
            onRun={handleRunSaved}
            onDelete={handleDeleteSaved}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
