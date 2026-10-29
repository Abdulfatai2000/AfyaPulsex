"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  Investigation,
  InvestigationDataStatus,
  InvestigationSummaryCounts,
  InvestigationTab,
} from "@/lib/services/officer/investigations";
import {
  DEFAULT_FILTERS,
  InvestigationsServiceError,
  deriveInvestigationStatus,
  getInvestigations,
  getInvestigationSummary,
} from "@/lib/services/officer/investigations";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import {
  getInvestigationSummaryLive,
  getInvestigationsLive,
} from "@/lib/services/officer/live-adapters";
import { InvestigationStatusTabs } from "./InvestigationStatusTabs";
import { InvestigationTable } from "./InvestigationTable";

const VALID_TABS: ReadonlyArray<InvestigationTab> = [
  "all",
  "active",
  "pending",
  "escalated",
  "closed",
];

function mapTabParam(value: string | null): InvestigationTab {
  return VALID_TABS.includes(value as InvestigationTab)
    ? (value as InvestigationTab)
    : DEFAULT_FILTERS.tab;
}

export default function InvestigationsCenterClient() {
  const { mode } = useDataMode();
  const searchParams = useSearchParams();
  const requestedTab = mapTabParam(searchParams.get("tab"));

  const [tab, setTab] = useState<InvestigationTab>(requestedTab);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [status, setStatus] = useState<InvestigationDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<InvestigationSummaryCounts | null>(
    null,
  );

  const load = useCallback(
    (next: InvestigationTab) => {
      // Centralized Data Mode: demo service or live backend, never mixed.
      resolveOfficerData(mode, {
        demo: () =>
          getInvestigations({ stateId: DEFAULT_FILTERS.stateId, tab: next }),
        live: () =>
          getInvestigationsLive({ stateId: DEFAULT_FILTERS.stateId, tab: next }),
      })
        .then((data) => {
          setInvestigations(data);
          setStatus(deriveInvestigationStatus(data));
          setError(null);
        })
        .catch((err: unknown) => {
          const mapped = mapFetchErrorStatus(err, InvestigationsServiceError);
          if (mapped === "unauthorized") {
            setStatus("unauthorized");
          } else if (mapped === "session-expired") {
            setStatus("session-expired");
          } else {
            setStatus("error");
            setError(
              err instanceof Error
                ? err.message
                : "Something went wrong loading investigations.",
            );
          }
        });
    },
    [mode],
  );

  // Load the initial view (honours ?tab=...) plus the jurisdiction-wide tab
  // counts. All state updates happen inside async callbacks, never in the
  // effect body.
  useEffect(() => {
    void load(requestedTab);
  }, [load, requestedTab]);

  useEffect(() => {
    let cancelled = false;
    void resolveOfficerData(mode, {
      demo: () => getInvestigationSummary(),
      live: () => getInvestigationSummaryLive(),
    })
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

  const handleTabChange = (next: InvestigationTab) => {
    setTab(next);
    setStatus("loading");
    void load(next);
  };

  const handleShowAll = () => {
    handleTabChange("all");
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <InvestigationStatusTabs
        value={tab}
        onChange={handleTabChange}
        counts={summary}
      />
      <InvestigationTable
        investigations={investigations}
        status={status}
        error={error}
        onRetry={() => handleTabChange(tab)}
        onShowAll={handleShowAll}
      />
    </div>
  );
}