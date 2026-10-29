import { getOfficerDataAccessAction, requireDemoSettingsAction } from "@/server/actions/officer/profile";
/**
 * Health Event Simulation (Demo) — typed frontend adapter.
 *
 * Purpose: Page 16 — a DEMO surface where officers explore how AfyaPulse
 * detects and respond to health events using controlled, simulated data.
 *
 * SECURITY / PRIVACY BOUNDARY:
 * - This module is the ONLY way the simulation UI learns about permissions,
 *   run state, demo datasets and reports. Mock records live here — never
 *   inside React components.
 * - Simulation data is ISOLATED. Nothing in this module reads or writes the
 *   production surveillance services (map, explorer, analytics,
 *   investigations, public-alerts, reports). A simulated signal is never
 *   mixed into real surveillance data; the backend remains the source of
 *   truth and will own the real run store.
 * - No MongoDB access, no backend credentials, no real patient information:
 *   only aggregate demo figures (report counts, area, pattern, window).
 * - Authorization is backend-authored: `getSimulationPermission()` returns the
 *   capability object; no role-name heuristics exist anywhere in the UI.
 *
 * TODO(DEV3): replace the mock adapter below with the real, DB-backed
 *   simulation service. The exported signatures are the contract — when the
 *   backend connects, the UI should not need rebuilding.
 * TODO(DEV4): enforce the simulation capability at the server entry point
 *   before any run or report round-trips, and tag every stored record with a
 *   dedicated simulation context so it can never be mistaken for a real signal.
 */

/* ------------------------------------------------------------------ *
 * Domain types.
 * ------------------------------------------------------------------ */

export type SimulationStepId = "inject" | "watch" | "investigate" | "report";

export interface SimulationStep {
  id: SimulationStepId;
  /** 1-based display number (1 — Inject Test Data, …). */
  index: number;
  label: string;
  description: string;
}

/** Run lifecycle — "idle" until Start Simulation creates a run. */
export type SimulationRunStatus = "idle" | "running" | "completed";

/** UI lifecycle for the simulation center (mirrors ApprovalsDataStatus). */
export type SimulationViewStatus =
  | "idle"
  | "starting"
  | "running"
  | "completed"
  | "error"
  | "permission-denied"
  | "session-expired";

/** Backend-authored capability for the current officer session. */
export interface SimulationPermissions {
  canRunSimulation: boolean;
}

/** Aggregate, simulated demo figures for a run — never patient-level data. */
export interface SimulationDataset {
  /** Simulated aggregate reports (demo only). */
  simulatedReports: number;
  /** Simulated jurisdiction label, e.g. "Ife Central LGA". */
  areaLabel: string;
  /** Simulated symptom pattern label, e.g. "Fever + Cough". */
  patternLabel: string;
  /** Simulated observation window, in days. */
  periodDays: number;
}

export interface SimulationData {
  simulationId: string;
  status: SimulationRunStatus;
  /** Step currently in progress while running; null when idle/completed. */
  currentStep: SimulationStepId | null;
  /** Steps finished so far, in order. */
  completedSteps: SimulationStepId[];
  startedAt: string | null;
  finishedAt: string | null;
  /** Demo-only aggregate dataset for this run. */
  dataset: SimulationDataset;
}

export interface SimulationReport {
  reportId: string;
  simulationId: string;
  generatedAt: string;
  /** Always the demo banner text — the report is never official. */
  reportTitle: string;
  /** Explicit non-authoritative disclaimer rendered with the report. */
  disclaimer: string;
  completedSteps: SimulationStepId[];
  dataset: SimulationDataset;
}

export type SimulationServiceErrorCode =
  | "permission-denied"
  | "unauthorized"
  | "network"
  | "invalid";

export class SimulationServiceError extends Error {
  constructor(
    public code: SimulationServiceErrorCode,
    message?: string,
  ) {
    super(message);
    this.name = "SimulationServiceError";
  }
}

/* ------------------------------------------------------------------ *
 * Constants (labels only — no authority rules, no patient data).
 * ------------------------------------------------------------------ */

/** The four-step workflow, in order. Labels/descriptions are fixed copy. */
export const SIMULATION_STEPS: readonly SimulationStep[] = [
  {
    id: "inject",
    index: 1,
    label: "Inject Test Data",
    description: "Generate controlled simulated health-event data.",
  },
  {
    id: "watch",
    index: 2,
    label: "Watch Detection",
    description:
      "Demonstrate how the system identifies a simulated aggregate pattern.",
  },
  {
    id: "investigate",
    index: 3,
    label: "Investigate",
    description:
      "Demonstrate how the simulated signal can enter an investigation workflow.",
  },
  {
    id: "report",
    index: 4,
    label: "Generate Report",
    description: "Demonstrate generation of a simulation-only report.",
  },
];

/** Hard privacy warning rendered by the UI (single source of the copy). */
export const DEMO_WARNING = "Demo data only. Not real patient information.";

/** Report banner — the report must never look official or real-world. */
export const SIMULATION_REPORT_TITLE = "SIMULATION REPORT — DEMO DATA";

export const SIMULATION_REPORT_DISCLAIMER =
  "Demo data only. This is not an official public-health report and never describes a confirmed outbreak or disease.";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ *
 * Mock adapter (temporary — TODO DEV3: replace with the real service).
 * ------------------------------------------------------------------ */

/**
 * Temporary dev permission: the current officer may run simulations. Backend
 * replaces this object entirely; the UI branches only on what it returns.
 *
 * `canRunSimulation: true` is the dev default so the full flow can be
 * exercised; flip it to `false` to see the permission-denied state.
 */
const MOCK_PERMISSIONS: SimulationPermissions = {
  canRunSimulation: true,
};

/** Simulated aggregate demo figures — nothing patient-level, ever. */
const DEMO_DATASET: SimulationDataset = {
  simulatedReports: 47,
  areaLabel: "Ife Central LGA",
  patternLabel: "Fever + Cough",
  periodDays: 14,
};

/** Wall-clock duration of a single workflow step (dev pacing only). */
const STEP_DURATION_MS = 1600;

interface SimulationRun {
  simulationId: string;
  startedAtMs: number;
  finishedAtMs: number | null;
  dataset: SimulationDataset;
}

/** In-memory run store for the dev adapter only — never a production store. */
const RUN_STORE = new Map<string, SimulationRun>();
let runCounter = 0;

interface RunProgress {
  status: SimulationRunStatus;
  currentStep: SimulationStepId | null;
  completedSteps: SimulationStepId[];
  finishedAtMs: number | null;
}

function progressFor(run: SimulationRun, nowMs: number): RunProgress {
  const elapsed = Math.max(0, nowMs - run.startedAtMs);
  const completedCount = Math.min(
    SIMULATION_STEPS.length,
    Math.floor(elapsed / STEP_DURATION_MS),
  );
  const completedSteps = SIMULATION_STEPS.slice(0, completedCount).map(
    (step) => step.id,
  );
  if (completedCount >= SIMULATION_STEPS.length) {
    return {
      status: "completed",
      currentStep: null,
      completedSteps,
      finishedAtMs:
        run.finishedAtMs ?? run.startedAtMs + STEP_DURATION_MS * SIMULATION_STEPS.length,
    };
  }
  return {
    status: "running",
    currentStep: SIMULATION_STEPS[completedCount].id,
    completedSteps,
    finishedAtMs: null,
  };
}

function toSimulationData(run: SimulationRun, nowMs: number): SimulationData {
  const progress = progressFor(run, nowMs);
  if (progress.finishedAtMs !== null) {
    run.finishedAtMs = progress.finishedAtMs;
  }
  return {
    simulationId: run.simulationId,
    status: progress.status,
    currentStep: progress.currentStep,
    completedSteps: [...progress.completedSteps],
    startedAt: new Date(run.startedAtMs).toISOString(),
    finishedAt:
      progress.finishedAtMs !== null
        ? new Date(progress.finishedAtMs).toISOString()
        : null,
    dataset: { ...run.dataset },
  };
}

function requireRun(simulationId: string): SimulationRun {
  const run = RUN_STORE.get(simulationId);
  if (!run) {
    throw new SimulationServiceError(
      "invalid",
      `Simulation "${simulationId}" was not found.`,
    );
  }
  return run;
}

/* ------------------------------------------------------------------ *
 * Service API.
 * ------------------------------------------------------------------ */

/**
 * Backend-authored capability for the current officer session. The UI never
 * derives authority from role names — it renders only what this returns.
 * In dev a mock adapter fulfils the contract; the backend remains authoritative.
 */
export async function getSimulationPermission(): Promise<SimulationPermissions> {
  const access = await getOfficerDataAccessAction();
  return { canRunSimulation: access.canRunSimulation };
}

/**
 * Start a new demo run. Returns immediately with the run in "running" state
 * and its first step in progress; the UI then polls for progress.
 */
export async function startSimulation(): Promise<SimulationData> {
  await requireDemoSettingsAction();
  await delay(320);
  if (!MOCK_PERMISSIONS.canRunSimulation) {
    throw new SimulationServiceError(
      "permission-denied",
      "You don't have permission to run health-event simulations.",
    );
  }
  runCounter += 1;
  const run: SimulationRun = {
    simulationId: `sim-${Date.now().toString(36)}-${runCounter}`,
    startedAtMs: Date.now(),
    finishedAtMs: null,
    dataset: { ...DEMO_DATASET },
  };
  RUN_STORE.set(run.simulationId, run);
  return toSimulationData(run, Date.now());
}

/** Poll progress for an in-flight run (drives the live workflow states). */
export async function getSimulationStatus(
  simulationId: string,
): Promise<SimulationData> {
  await requireDemoSettingsAction();
  await delay(110);
  return toSimulationData(requireRun(simulationId), Date.now());
}

/** Final state of a finished run. Throws while the run is still in flight. */
export async function getSimulationResult(
  simulationId: string,
): Promise<SimulationData> {
  await requireDemoSettingsAction();
  await delay(160);
  const data = toSimulationData(requireRun(simulationId), Date.now());
  if (data.status !== "completed") {
    throw new SimulationServiceError(
      "invalid",
      "This simulation is still running. Please wait for it to finish.",
    );
  }
  return data;
}

/**
 * Produce the simulation-only report for a completed run. The report carries
 * an explicit demo title and disclaimer — it is never an official report.
 */
export async function generateSimulationReport(
  simulationId: string,
): Promise<SimulationReport> {
  await requireDemoSettingsAction();
  await delay(340);
  const run = requireRun(simulationId);
  const data = toSimulationData(run, Date.now());
  if (data.status !== "completed") {
    throw new SimulationServiceError(
      "invalid",
      "A report can only be generated after the simulation completes.",
    );
  }
  return {
    reportId: `${simulationId}-report`,
    simulationId,
    generatedAt: data.finishedAt ?? new Date().toISOString(),
    reportTitle: SIMULATION_REPORT_TITLE,
    disclaimer: SIMULATION_REPORT_DISCLAIMER,
    completedSteps: [...data.completedSteps],
    dataset: { ...data.dataset },
  };
}
