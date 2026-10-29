"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ResponseDataStatus,
  ResponseRecord,
  ResponseStageFilter,
  ResponseSummaryCounts,
} from "@/lib/services/officer/response";
import {
  DEFAULT_FILTERS,
  ResponseServiceError,
  deriveResponseStatus,
  getResponseSummary,
  getResponses,
} from "@/lib/services/officer/response";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getResponsesLive } from "@/lib/services/officer/live-adapters";
import { ResponseWorkflow } from "./ResponseWorkflow";
import { ResponseTable } from "./ResponseTable";

export default function ResponseCenterClient() {
  const { mode } = useDataMode();
  const [stage, setStage] = useState<ResponseStageFilter>("all");
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [status, setStatus] = useState<ResponseDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ResponseSummaryCounts | null>(null);
  const requestSeq = useRef(0);

  const load = useCallback(
    (next: ResponseStageFilter) => {
      const seq = ++requestSeq.current;
      // Centralized Data Mode (live has no response endpoint yet → error state).
      resolveOfficerData(mode, {
        demo: () =>
          getResponses({ stateId: DEFAULT_FILTERS.stateId, stage: next }),
        live: () => getResponsesLive(),
      })
        .then((data) => {
          if (seq !== requestSeq.current) {
            return;
          }
          setResponses(data);
          setStatus(deriveResponseStatus(data));
        })
        .catch((err: unknown) => {
          if (seq !== requestSeq.current) {
            return;
          }
          const mapped = mapFetchErrorStatus(err, ResponseServiceError);
          if (mapped === "unauthorized") {
            setStatus("unauthorized");
          } else if (mapped === "session-expired") {
            setStatus("session-expired");
          } else {
            setStatus("error");
            setError(
              err instanceof Error
                ? err.message
                : "Something went wrong loading responses.",
            );
          }
        });
    },
    [mode],
  );

  // Load the initial view plus the jurisdiction-wide workflow counts. All state
  // updates happen inside async callbacks, never in the effect body.
  useEffect(() => {
    void load("all");
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void resolveOfficerData(mode, {
      demo: () => getResponseSummary(),
      live: () => getResponsesLive(),
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

  const handleStageChange = (next: ResponseStageFilter) => {
    setStage(next);
    setStatus("loading");
    setError(null);
    void load(next);
  };

  const handleShowAll = () => {
    handleStageChange("all");
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ResponseWorkflow
        counts={summary}
        selected={stage}
        onSelect={handleStageChange}
      />
      <ResponseTable
        responses={responses}
        status={status}
        error={error}
        onRetry={() => handleStageChange(stage)}
        onShowAll={handleShowAll}
      />
    </div>
  );
}