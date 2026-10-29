"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ForbiddenState } from "@/components/feedback/ForbiddenState";
import { SessionExpiredState } from "@/components/feedback/SessionExpiredState";
import type {
  SimulationData,
  SimulationPermissions,
  SimulationReport,
  SimulationViewStatus,
} from "@/lib/services/officer/simulation";
import {
  SimulationServiceError,
  generateSimulationReport,
  getSimulationResult,
  getSimulationStatus,
  startSimulation,
} from "@/lib/services/officer/simulation";
import { SimulationBanner } from "./SimulationBanner";
import { SimulationControls } from "./SimulationControls";
import { SimulationProgress } from "./SimulationProgress";

const POLL_INTERVAL_MS = 700;

const GENERIC_ERROR =
  "Something went wrong with the simulation. Please try again.";

function errorMessage(err: unknown): string {
  if (err instanceof SimulationServiceError) {
    if (err.code === "permission-denied") {
      return "You don't have permission to run health-event simulations.";
    }
    if (err.code === "unauthorized") {
      return "Your session has expired. Please sign in again.";
    }
    return err.message || GENERIC_ERROR;
  }
  return err instanceof Error ? err.message : GENERIC_ERROR;
}

interface Props {
  /** Backend-provided simulation capability for the current officer session. */
  initialPermission: SimulationPermissions;
}

export default function SimulationCenterClient({ initialPermission }: Props) {
  const [status, setStatus] = useState<SimulationViewStatus>("idle");
  const [data, setData] = useState<SimulationData | null>(null);
  const [score, setScore] = useState<SimulationData | null>(null);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Poll the active run until it completes, then resolve the final state.
  useEffect(() => {
    if (status !== "running" || !data) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = () => {
      getSimulationStatus(data.simulationId)
        .then((next) => {
          if (cancelled) {
            return;
          }
          if (next.status === "completed") {
            void getSimulationResult(next.simulationId)
              .then((finished) => {
                if (!cancelled) {
                  setScore(finished);
                  setStatus("completed");
                }
              })
              .catch((err: unknown) => {
                if (!cancelled) {
                  setError(errorMessage(err));
                  setStatus("error");
                }
              });
            return;
          }
          setData(next);
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(errorMessage(err));
            setStatus("error");
          }
        });
    };

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [status, data]);

  const handleStart = useCallback(() => {
    setStatus("starting");
    setData(null);
    setError(null);
    setReport(null);
    setReportError(null);
    void startSimulation()
      .then((run) => {
        setData(run);
        setStatus("running");
      })
      .catch((err: unknown) => {
        setError(errorMessage(err));
        setStatus("error");
      });
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setData(null);
    setReport(null);
    setReportError(null);
    setStatus("idle");
    void startSimulation()
      .then((run) => {
        setData(run);
        setStatus("running");
      })
      .catch((err: unknown) => {
        setError(errorMessage(err));
        setStatus("error");
      });
  }, []);

  const handleGenerateReport = useCallback(() => {
    if (!score || status !== "completed") {
      return;
    }
    setGeneratingReport(true);
    setReportError(null);
    void generateSimulationReport(score.simulationId)
      .then((generated) => {
        setReport(generated);
        setGeneratingReport(false);
      })
      .catch((err: unknown) => {
        setGeneratingReport(false);
        setReportError(errorMessage(err));
      });
  }, [score, status]);

  const isForbidden =
    !initialPermission.canRunSimulation ||
    error === "You don't have permission to run health-event simulations.";
  const isSessionExpired = error === "Your session has expired. Please sign in again.";

  if (isForbidden) {
    return (
      <ForbiddenState
        title="You don't have permission to run health-event simulations"
        description="Your account can use AfyaPulse, but running the demo health-event simulation is a separate capability granted by the backend. Contact your administrator if you should have access."
      />
    );
  }

  if (isSessionExpired) {
    return <SessionExpiredState title="Your session has expired" />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SimulationBanner />

      <SimulationProgress
        status={status}
        data={score ?? data}
        report={report}
        generatingReport={generatingReport}
        reportError={reportError}
        onGenerateReport={handleGenerateReport}
      />

      {status === "error" || error ? (
        <ErrorState
          title="Unable to run the simulation"
          description={error ?? GENERIC_ERROR}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              type="button"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Retry
            </Button>
          }
        />
      ) : (
        <SimulationControls
          status={status}
          canRun={initialPermission.canRunSimulation}
          onStart={handleStart}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}