import {
  Check,
  CheckCircle2,
  FileText,
  FlaskConical,
  Loader2,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/server/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  SimulationData,
  SimulationReport,
  SimulationStep,
  SimulationViewStatus,
} from "@/lib/services/officer/simulation";
import {
  DEMO_WARNING,
  SIMULATION_REPORT_TITLE,
  SIMULATION_STEPS,
} from "@/lib/services/officer/simulation";

const TOTAL_STEPS = SIMULATION_STEPS.length;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type StepVisual =
  | { kind: "completed" }
  | { kind: "current" }
  | { kind: "pending" }
  | { kind: "error" };

function visualForStep(
  step: SimulationStep,
  data: SimulationData | null,
  status: SimulationViewStatus,
): StepVisual {
  if (status === "error") {
    return { kind: "error" };
  }
  if (data === null) {
    return { kind: "pending" };
  }
  if (data.completedSteps.includes(step.id)) {
    return { kind: "completed" };
  }
  if (data.currentStep === step.id && data.status === "running") {
    return { kind: "current" };
  }
  return { kind: "pending" };
}

const STEP_SR_TEXT: Record<StepVisual["kind"], string> = {
  completed: "Completed",
  current: "In progress",
  pending: "Pending",
  error: "Failed",
};

function StepCircle({
  step,
  data,
  status,
}: {
  step: SimulationStep;
  data: SimulationData | null;
  status: SimulationViewStatus;
}) {
  const visual = visualForStep(step, data, status);
  return (
    <li className="relative flex min-w-0 flex-1 flex-row items-start gap-3 lg:flex-col lg:items-center lg:gap-2 lg:px-3 lg:text-center">
      <span
        className={cn(
          "relative z-10 flex size-10 flex-none items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
          visual.kind === "completed" &&
            "border-success-green bg-success-green text-white",
          visual.kind === "current" &&
            "border-primary-blue bg-primary-blue text-white",
          visual.kind === "pending" &&
            "border-gray-300 bg-white text-gray-400",
          visual.kind === "error" &&
            "border-danger-red bg-danger-red/10 text-danger-red",
        )}
      >
        {visual.kind === "completed" ? (
          <Check className="size-4" aria-hidden="true" />
        ) : visual.kind === "current" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : visual.kind === "error" ? (
          <TriangleAlert className="size-4" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{step.index}</span>
        )}
        <span className="sr-only">
          Step {step.index} — {step.label}: {STEP_SR_TEXT[visual.kind]}
        </span>
      </span>

      <div className="min-w-0 lg:flex lg:flex-col lg:items-center">
        <p className="text-sm font-semibold text-deep-navy">
          {step.index} — {step.label}
        </p>
        <p className="mt-0.5 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
          {step.description}
        </p>
      </div>
    </li>
  );
}

function statusLine(
  status: SimulationViewStatus,
  data: SimulationData | null,
): { text: string; running: boolean; completed: boolean } {
  if (status === "starting") {
    return {
      text: "Preparing the simulation…",
      running: true,
      completed: false,
    };
  }
  if (status === "error") {
    return {
      text: "The simulation could not continue. Use Retry below to try again.",
      running: false,
      completed: false,
    };
  }
  if (data && data.status === "completed") {
    return {
      text: "Simulation completed — demo data only.",
      running: false,
      completed: true,
    };
  }
  if (data && data.status === "running") {
    const current = SIMULATION_STEPS.find((s) => s.id === data.currentStep);
    const stepText =
      current && data.currentStep
        ? `step ${current.index} of ${TOTAL_STEPS}: ${current.label}`
        : "the workflow";
    return {
      text: `Simulation running — ${stepText}.`,
      running: true,
      completed: false,
    };
  }
  return {
    text: "Simulation not started. Select Start Simulation to begin the demo.",
    running: false,
    completed: false,
  };
}

function DatasetFacet({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-deep-navy">{value}</dd>
    </div>
  );
}

interface SimulationProgressProps {
  status: SimulationViewStatus;
  data: SimulationData | null;
  report: SimulationReport | null;
  generatingReport: boolean;
  reportError: string | null;
  onGenerateReport: () => void;
}

/**
 * Four-step simulation workflow plus its live states, the demo-only aggregate
 * result, and the SIMULATION REPORT — DEMO DATA card. Pure presentation: all
 * data and copy arrive from the simulation service boundary.
 */
export function SimulationProgress({
  status,
  data,
  report,
  generatingReport,
  reportError,
  onGenerateReport,
}: SimulationProgressProps) {
  const line = statusLine(status, data);
  const completedCount =
    data && data.status === "completed" ? TOTAL_STEPS : data?.completedSteps.length ?? 0;
  const showBar = data !== null && (data.status === "running" || data.status === "completed");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-white p-4">
        <ol className="relative flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-0">
          <span
            aria-hidden="true"
            className="absolute bottom-5 left-5 top-5 w-0.5 bg-gray-200 lg:bottom-auto lg:right-4 lg:top-5 lg:left-4 lg:h-0.5 lg:w-auto"
          />
          {SIMULATION_STEPS.map((step) => (
            <StepCircle
              key={step.id}
              step={step}
              data={data}
              status={status}
            />
          ))}
        </ol>

        {showBar ? (
          <div className="min-w-0">
            <div
              role="progressbar"
              aria-label="Simulation progress"
              aria-valuemin={0}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={completedCount}
              aria-valuetext={`${completedCount} of ${TOTAL_STEPS} steps complete`}
              className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
            >
              <div
                className="h-full rounded-full bg-primary-blue transition-all duration-500"
                style={{
                  width: `${(completedCount / TOTAL_STEPS) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          {line.running ? (
            <Loader2 className="size-3.5 flex-none animate-spin text-primary-blue" aria-hidden="true" />
          ) : line.completed ? (
            <CheckCircle2 className="size-3.5 flex-none text-success-green" aria-hidden="true" />
          ) : null}
          <span>{line.text}</span>
        </p>
      </div>

      {report ? <SimulationReportCard report={report} /> : null}

      {status === "completed" && data ? (
        <>
          <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-deep-navy">
                <FlaskConical className="size-4 text-primary-blue" aria-hidden="true" />
                Simulated result (demo)
              </h2>
              {generatingReport ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Generating report…
                </span>
              ) : null}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <DatasetFacet
                label="Simulated reports"
                value={String(data.dataset.simulatedReports)}
              />
              <DatasetFacet label="Simulated area" value={data.dataset.areaLabel} />
              <DatasetFacet label="Simulated pattern" value={data.dataset.patternLabel} />
              <DatasetFacet
                label="Simulated period"
                value={`${data.dataset.periodDays} days`}
              />
            </dl>

            <p className="flex items-start gap-2 rounded-lg border border-primary-blue/20 bg-primary-blue/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary-blue" aria-hidden="true" />
              <span>
                <strong className="text-deep-navy">Simulated pattern detected</strong>{" "}
                — demo signal requires review. This is a simulation exercise, not a
                confirmed outbreak or confirmed disease.
              </span>
            </p>

            {!report ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Generate a simulation-only report for this completed demo run.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onGenerateReport}
                    disabled={generatingReport}
                    type="button"
                    aria-label="Generate simulated demo report"
                  >
                    {generatingReport ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <FileText className="size-3.5" aria-hidden="true" />
                    )}
                    Generate Simulation Report
                  </Button>
                </div>
                {reportError ? (
                  <p role="alert" className="flex items-center gap-1.5 text-xs text-danger-red">
                    <TriangleAlert className="size-3.5 flex-none" aria-hidden="true" />
                    {reportError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="flex items-start gap-2 rounded-lg border border-warning-amber/30 bg-warning-amber/10 px-3 py-2 text-xs font-medium leading-relaxed text-warning-amber">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{DEMO_WARNING}</span>
          </p>
        </>
      ) : null}
    </div>
  );
}

function SimulationReportCard({ report }: { report: SimulationReport }) {
  return (
    <section
      aria-label={SIMULATION_REPORT_TITLE}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-danger-red/30 bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger-red/30 bg-danger-red/10 px-3 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-danger-red">
          <FileText className="size-4" aria-hidden="true" />
          {SIMULATION_REPORT_TITLE}
        </h2>
        <span className="rounded-full bg-danger-red/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger-red">
          Demo
        </span>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-warning-amber/30 bg-warning-amber/10 px-3 py-2 text-xs font-medium leading-relaxed text-warning-amber">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{report.disclaimer}</span>
      </p>

      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-xs sm:grid-cols-2">
        <DatasetFacet label="Report ID" value={report.reportId} />
        <DatasetFacet label="Simulation ID" value={report.simulationId} />
        <DatasetFacet label="Generated" value={formatDateTime(report.generatedAt)} />
        <DatasetFacet
          label="Simulated reports"
          value={String(report.dataset.simulatedReports)}
        />
        <DatasetFacet label="Simulated area" value={report.dataset.areaLabel} />
        <DatasetFacet label="Simulated pattern" value={report.dataset.patternLabel} />
        <DatasetFacet
          label="Simulated period"
          value={`${report.dataset.periodDays} days`}
        />
        <DatasetFacet
          label="Workflow steps completed"
          value={`${report.completedSteps.length} of ${TOTAL_STEPS}`}
        />
      </dl>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        This report is simulation-only and never part of official public-health
        reporting. It contains no real patient information.
      </p>
    </section>
  );
}