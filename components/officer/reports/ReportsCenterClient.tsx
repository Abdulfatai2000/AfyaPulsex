"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  LayoutTemplate,
  RefreshCw,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ReportGenerationResult,
  ReportsFeatureStatus,
  ReportsViewTab,
  StandardReportDefinition,
  StandardReportId,
} from "@/lib/services/officer/reports";
import {
  REPORT_TABS,
  ReportsServiceError,
  deriveReportsStatus,
  downloadReportCsv,
  generateStandardReport,
  getCustomReportStatus,
  getScheduledReportsStatus,
  getStandardReports,
} from "@/lib/services/officer/reports";
import type { ReportsDataStatus } from "@/lib/services/officer/reports";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getReportsLive } from "@/lib/services/officer/live-adapters";
import { ReportsTabs } from "./ReportsTabs";
import { ReportsTable } from "./ReportsTable";
import { ReportGenerateDialog } from "./ReportGenerateDialog";

const VALID_TABS: ReadonlyArray<ReportsViewTab> = REPORT_TABS.map(
  (tab) => tab.value,
);

function mapTabParam(value: string | null): ReportsViewTab {
  return VALID_TABS.includes(value as ReportsViewTab)
    ? (value as ReportsViewTab)
    : "standard";
}

type FeatureStatus = "idle" | "loading" | "ready" | "error";

function FeatureSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6"
      aria-busy="true"
      aria-label="Loading report feature"
    >
      <Skeleton className="h-5 w-56 rounded-lg" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-3 w-3/4 rounded" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-3 w-1/2 rounded" />
        ))}
      </div>
    </div>
  );
}

const FEATURE_ICONS: Record<ReportsViewTab, typeof LayoutTemplate> = {
  standard: LayoutTemplate,
  custom: SlidersHorizontal,
  scheduled: CalendarClock,
};

function FeaturePane({ feature, tab }: { feature: ReportsFeatureStatus; tab: ReportsViewTab }) {
  const Icon = FEATURE_ICONS[tab];
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-deep-navy">
            <Icon className="h-4 w-4 shrink-0 text-primary-blue" aria-hidden="true" />
            {feature.heading}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {feature.description}
          </p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
          In development
        </span>
      </div>
      <ul className="flex min-w-0 flex-col gap-1.5 border-t border-gray-100 pt-3">
        {feature.notes.map((note) => (
          <li key={note} className="flex items-center gap-2 text-xs text-gray-600">
            <span className="h-1 w-1 shrink-0 rounded-full bg-primary-blue" aria-hidden="true" />
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReportsCenterClient() {
  const { mode } = useDataMode();
  const searchParams = useSearchParams();
  const requestedTab = mapTabParam(searchParams.get("tab"));

  const [tab, setTab] = useState<ReportsViewTab>(requestedTab);
  const [definitions, setDefinitions] = useState<StandardReportDefinition[]>([]);
  const [listStatus, setListStatus] = useState<ReportsDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [busyFor, setBusyFor] = useState<StandardReportId | null>(null);
  const [failedReportId, setFailedReportId] = useState<StandardReportId | null>(
    null,
  );
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateResult, setGenerateResult] =
    useState<ReportGenerationResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [feature, setFeature] = useState<ReportsFeatureStatus | null>(null);
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus>("idle");
  const [featureReload, setFeatureReload] = useState(0);

  const loadCatalog = useCallback(() => {
    // Centralized Data Mode (live has no reports endpoint yet → error state).
    resolveOfficerData(mode, {
      demo: () => getStandardReports(),
      live: () => getReportsLive(),
    })
      .then((data) => {
        setDefinitions(data);
        setListStatus(deriveReportsStatus(data));
        setError(null);
      })
      .catch((err: unknown) => {
        const mapped = mapFetchErrorStatus(err, ReportsServiceError);
        if (mapped === "unauthorized") {
          setListStatus("unauthorized");
        } else if (mapped === "session-expired") {
          setListStatus("session-expired");
        } else {
          setListStatus("error");
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong loading standard reports.",
          );
        }
      });
  }, [mode]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  // Load the custom/scheduled feature module when its tab is active. State
  // updates happen inside async callbacks, never in the effect body.
  useEffect(() => {
    if (tab === "standard") {
      return;
    }
    let cancelled = false;
    const promise =
      tab === "custom"
        ? getCustomReportStatus()
        : getScheduledReportsStatus();
    promise
      .then((status) => {
        if (!cancelled) {
          setFeature(status);
          setFeatureStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeatureStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, featureReload]);

  const handleTabChange = (next: ReportsViewTab) => {
    setTab(next);
    setGenerateError(null);
    setGenerateResult(null);
    setDialogOpen(false);
  };

  const handleGenerate = (reportId: StandardReportId) => {
    if (busyFor) {
      return;
    }
    setBusyFor(reportId);
    setFailedReportId(null);
    setGenerateError(null);
    // Generation follows the active mode (live → error state until connected).
    const task =
      mode === "live" ? getReportsLive() : generateStandardReport(reportId);
    task
      .then((result) => {
        setBusyFor(null);
        setGenerateResult(result);
        setDialogOpen(true);
      })
      .catch((err: unknown) => {
        setBusyFor(null);
        setFailedReportId(reportId);
        setGenerateError(
          err instanceof Error
            ? err.message
            : "The report could not be generated. Please try again.",
        );
      });
  };

  const handleExport = () => {
    if (generateResult) {
      downloadReportCsv(generateResult);
    }
  };

  const standardViews =
    tab === "standard" ? (
      <div className="flex min-w-0 flex-col gap-3">
        {generateError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-danger-red/30 bg-danger-red/10 px-3 py-2.5"
          >
            <TriangleAlert
              className="h-4 w-4 shrink-0 text-danger-red"
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 text-xs text-danger-red">
              {generateError} The report was not generated — it was not
              fabricated from any raw records.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {failedReportId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerate(failedReportId)}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" />
                  Retry
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGenerateError(null)}
                type="button"
              >
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}
        <ReportsTable
          definitions={definitions}
          status={listStatus}
          busyFor={busyFor}
          error={error}
          onGenerate={handleGenerate}
          onRetry={() => {
            setListStatus("loading");
            void loadCatalog();
          }}
          onReset={() => {
            setListStatus("loading");
            void loadCatalog();
          }}
        />
      </div>
    ) : null;

  const featureViews =
    featureStatus === "idle" || featureStatus === "loading" ? (
      <FeatureSkeleton />
    ) : featureStatus === "error" ? (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 py-12 text-center">
        <TriangleAlert
          className="h-5 w-5 text-danger-red"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold text-deep-navy">
          Unable to load this feature
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          Something went wrong. Please try again.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFeatureStatus("idle");
            setFeatureReload((value) => value + 1);
          }}
          type="button"
        >
          <RefreshCw aria-hidden="true" />
          Retry
        </Button>
      </div>
    ) : feature ? (
      <FeaturePane feature={feature} tab={tab} />
    ) : null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ReportsTabs value={tab} onChange={handleTabChange} />
      {tab === "standard" ? standardViews : featureViews}

      <Dialog
        open={dialogOpen}
        onOpenChange={(next) => {
          if (!next) {
            setDialogOpen(false);
          }
        }}
      >
        {dialogOpen && generateResult ? (
          <DialogContent>
            <ReportGenerateDialog
              result={generateResult}
              onExport={handleExport}
              onClose={() => {
                setDialogOpen(false);
                setGenerateResult(null);
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}