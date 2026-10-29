/**
 * Officer Responses - aggregate response management service (mock).
 *
 * SECURITY / PRIVACY CONTRACT (DEV4):
 * - This module returns ONLY aggregate, operational response records:
 *   aggregate signal wording, jurisdiction area, workflow status, the assigned
 *   officer, and the last-updated timestamp. No citizen names, citizen ids,
 *   phone numbers, exact addresses, individual health records, or raw citizen
 *   submissions are ever produced here.
 * - The assigned officer (e.g. "Dr. Adebayo") is the operational responder /
 *   coordinator — an authorized officer of the portal — never a citizen.
 * - Location identifiers are validated through the shared geography service,
 *   so an LGA can never be attached to the wrong State and no second geography
 *   list exists.
 * - The backend/auth layer (DEV4) remains the authoritative jurisdiction
 *   boundary for what the current officer may actually access.
 *
 * Workflow model (dev contract — the portal's operational stages): a response
 * moves through Directed → Reviewing → Monitoring → Escalated → Response →
 * Resolved. Only forward transitions are permitted here, and advancing is the
 * only way a response changes stage (mirrors the server workflow in
 * server/models/Response; see TODO DEV3 below).
 *
 * TODO(DEV3): Replace the mock bodies below with the real response pipeline
 *   (server/services/responses). The signatures and types are the contract.
 * TODO(DEV4): Scope by authenticated officer jurisdiction and enforce
 *   authorization at the server entry point before any response returns.
 */

import { geographyService } from "./geography";
import type { GeographyLga } from "./geography";

export type ResponseStatus =
  | "directed"
  | "reviewing"
  | "monitoring"
  | "escalated"
  | "response"
  | "resolved";

/** Ordered workflow stages — the only order a response may move through. */
export const RESPONSE_STAGES: ReadonlyArray<{
  value: ResponseStatus;
  label: string;
  description: string;
}> = [
  {
    value: "directed",
    label: "Directed",
    description: "Response coordinated and assigned to an operational team.",
  },
  {
    value: "reviewing",
    label: "Reviewing",
    description: "Field reports reviewed and the response plan validated.",
  },
  {
    value: "monitoring",
    label: "Monitoring",
    description: "Situation monitored across reporting wards.",
  },
  {
    value: "escalated",
    label: "Escalated",
    description: "Raised for state-level coordination and wider support.",
  },
  {
    value: "response",
    label: "Response",
    description: "Mitigation deployed on the ground with community engagement.",
  },
  {
    value: "resolved",
    label: "Resolved",
    description: "Response completed and verified.",
  },
];

export const RESPONSE_STAGE_LABELS: Record<ResponseStatus, string> =
  Object.fromEntries(
    RESPONSE_STAGES.map((stage) => [stage.value, stage.label]),
  ) as Record<ResponseStatus, string>;

/** Filter over the workflow stages shown by the list — "all" shows every stage. */
export type ResponseStageFilter = "all" | ResponseStatus;

export interface ResponseFilters {
  stateId: string;
  stage: ResponseStageFilter;
}

export const DEFAULT_FILTERS: ResponseFilters = {
  stateId: "osun",
  stage: "all",
};

/** The operational officer roster responses may be assigned to. */
export const RESPONSE_OFFICERS: ReadonlyArray<string> = [
  "Dr. Adebayo",
  "Dr. Enola",
  "Dr. Ifeoma",
  "Dr. Kemi",
  "Dr. Tunde",
];

export interface ResponseRecord {
  id: string;
  /** Aggregate signal wording, e.g. "Fever + Cough" — never a citizen report. */
  signal: string;
  stateId: string;
  stateName: string;
  /** Shared geography LGA id, e.g. "ife-central". */
  lgaId: string;
  lgaName: string;
  status: ResponseStatus;
  /** Assigned officer (operational portal user), never a citizen. */
  assignedTo: string;
  lastUpdated: string;
}

export interface ResponseSummaryCounts {
  total: number;
  directed: number;
  reviewing: number;
  monitoring: number;
  escalated: number;
  response: number;
  resolved: number;
}

export type ResponseDataStatus =
  | "loading"
  | "ready"
  | "empty"
  | "unauthorized"
  | "session-expired"
  | "error";

export class ResponseServiceError extends Error {
  constructor(
    public code: "unauthorized" | "network",
    message?: string,
  ) {
    super(message);
    this.name = "ResponseServiceError";
  }
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Dev aggregate response records — all structurally valid Osun State
 * geography. Every stage carries at least one record so the workflow tracker
 * aggregates honestly from service data.
 */
interface ResponseSeed
  extends Omit<ResponseRecord, "stateName" | "lgaName"> {
  /** When the response was directed into the workflow (ISO). */
  directedOn: string;
}

const RESPONSE_SEEDS: ResponseSeed[] = [
  {
    id: "rsp-001",
    signal: "Fever + Cough",
    stateId: "osun",
    lgaId: "ife-central",
    status: "directed",
    assignedTo: "Dr. Adebayo",
    lastUpdated: "2026-09-16T10:15:00Z",
    directedOn: "2026-09-16T10:00:00Z",
  },
  {
    id: "rsp-002",
    signal: "Diabetes + Headache",
    stateId: "osun",
    lgaId: "ife-central",
    status: "reviewing",
    assignedTo: "Dr. Enola",
    lastUpdated: "2026-09-16T09:20:00Z",
    directedOn: "2026-09-15T16:40:00Z",
  },
  {
    id: "rsp-003",
    signal: "Diarrhoea activity rise",
    stateId: "osun",
    lgaId: "ife-central",
    status: "monitoring",
    assignedTo: "Dr. Adebayo",
    lastUpdated: "2026-09-15T09:05:00Z",
    directedOn: "2026-09-14T14:00:00Z",
  },
  {
    id: "rsp-004",
    signal: "Rash cluster",
    stateId: "osun",
    lgaId: "ife-south",
    status: "escalated",
    assignedTo: "Dr. Kemi",
    lastUpdated: "2026-09-15T12:40:00Z",
    directedOn: "2026-09-12T06:30:00Z",
  },
  {
    id: "rsp-005",
    signal: "Respiratory symptoms increase",
    stateId: "osun",
    lgaId: "ife-central",
    status: "reviewing",
    assignedTo: "Dr. Adebayo",
    lastUpdated: "2026-09-16T08:30:00Z",
    directedOn: "2026-09-15T19:10:00Z",
  },
  {
    id: "rsp-006",
    signal: "Typhoid-like cluster",
    stateId: "osun",
    lgaId: "ife-south",
    status: "response",
    assignedTo: "Dr. Tunde",
    lastUpdated: "2026-09-16T12:20:00Z",
    directedOn: "2026-09-13T12:20:00Z",
  },
  {
    id: "rsp-007",
    signal: "Cholera-like diarrhoea reports",
    stateId: "osun",
    lgaId: "ife-east",
    status: "response",
    assignedTo: "Dr. Ifeoma",
    lastUpdated: "2026-09-16T07:45:00Z",
    directedOn: "2026-09-12T07:45:00Z",
  },
  {
    id: "rsp-008",
    signal: "Malaria-like fever — ward cluster",
    stateId: "osun",
    lgaId: "ife-north",
    status: "monitoring",
    assignedTo: "Dr. Ifeoma",
    lastUpdated: "2026-09-12T18:10:00Z",
    directedOn: "2026-09-11T18:10:00Z",
  },
  {
    id: "rsp-009",
    signal: "Unexplained rash reports",
    stateId: "osun",
    lgaId: "ife-south",
    status: "directed",
    assignedTo: "Dr. Enola",
    lastUpdated: "2026-09-16T11:30:00Z",
    directedOn: "2026-09-16T11:30:00Z",
  },
  {
    id: "rsp-010",
    signal: "Eye irritation cluster",
    stateId: "osun",
    lgaId: "ife-east",
    status: "directed",
    assignedTo: "Dr. Kemi",
    lastUpdated: "2026-09-16T06:50:00Z",
    directedOn: "2026-09-16T06:50:00Z",
  },
  {
    id: "rsp-011",
    signal: "Acute respiratory surge",
    stateId: "osun",
    lgaId: "ilesha-west",
    status: "escalated",
    assignedTo: "Dr. Ifeoma",
    lastUpdated: "2026-09-16T09:10:00Z",
    directedOn: "2026-09-14T09:10:00Z",
  },
  {
    id: "rsp-012",
    signal: "Typhoid cluster — resolved",
    stateId: "osun",
    lgaId: "ife-central",
    status: "resolved",
    assignedTo: "Dr. Adebayo",
    lastUpdated: "2026-09-10T13:00:00Z",
    directedOn: "2026-09-02T13:00:00Z",
  },
];

/** Stable id → richer display title shown on the detail view. */
const DETAIL_TITLES: Record<string, string> = {
  "rsp-001": "Fever + Cough — community response directed in Ife Central LGA",
  "rsp-002": "Diabetes + Headache — referral response under review in Ife Central LGA",
  "rsp-003": "Diarrhoea activity — active monitoring in Ife Central LGA",
  "rsp-004": "Rash cluster — escalated for coordination in Ife South LGA",
  "rsp-005": "Respiratory symptoms — response plan under review in Ife Central LGA",
  "rsp-006": "Typhoid-like cluster — response underway in Ife South LGA",
  "rsp-007": "Cholera-like diarrhoea — response underway in Ife East LGA",
  "rsp-008": "Malaria-like fever — passive monitoring in Ife North LGA",
  "rsp-009": "Rash reports — response directed in Ife South LGA",
  "rsp-010": "Eye irritation — response directed in Ife East LGA",
  "rsp-011": "Acute respiratory surge — escalated in Ilesha West LGA",
  "rsp-012": "Typhoid cluster — resolved in Ife Central LGA",
};

/**
 * Validate the officer's jurisdictional State through the shared geography
 * service and return its LGA lookup. An unknown State throws the same
 * restricted-jurisdiction error used by the map, explorer, and investigations
 * services.
 */
async function resolveScope(
  stateId: string,
): Promise<{ stateName: string; lgas: Map<string, GeographyLga> }> {
  const state = stateId
    ? await geographyService.getStateById(stateId)
    : null;
  if (!state) {
    throw new ResponseServiceError(
      "unauthorized",
      "Access to the selected State is restricted.",
    );
  }
  const lgas = await geographyService.getLgasByState(state.id);
  return {
    stateName: state.name,
    lgas: new Map(lgas.map((lga) => [lga.id, lga])),
  };
}

function stageIndex(status: ResponseStatus): number {
  return RESPONSE_STAGES.findIndex((stage) => stage.value === status);
}

/** The next workflow stage after `status`, or null when already resolved. */
export function nextResponseStage(status: ResponseStatus): ResponseStatus | null {
  const next = RESPONSE_STAGES[stageIndex(status) + 1];
  return next ? next.value : null;
}

/** Whether a response status matches the given list filter. */
export function statusMatchesStage(
  status: ResponseStatus,
  stage: ResponseStageFilter,
): boolean {
  return stage === "all" || status === stage;
}

function collect(
  scope: { stateName: string; lgas: Map<string, GeographyLga> },
  stage: ResponseStageFilter,
): ResponseRecord[] {
  const list: ResponseRecord[] = [];
  for (const raw of RESPONSE_SEEDS) {
    const lga = scope.lgas.get(raw.lgaId);
    if (!lga) {
      // Structurally impossible holder — skip rather than invent a location.
      continue;
    }
    if (!statusMatchesStage(raw.status, stage)) {
      continue;
    }
    list.push({
      id: raw.id,
      signal: raw.signal,
      stateId: raw.stateId,
      stateName: scope.stateName,
      lgaId: raw.lgaId,
      lgaName: lga.name,
      status: raw.status,
      assignedTo: raw.assignedTo,
      lastUpdated: raw.lastUpdated,
    });
  }
  return list;
}

/**
 * Jurisdiction-wide response counts per workflow stage.
 * TODO(DEV3): Replace with a real aggregation over the response store.
 */
export async function getResponseSummary(
  stateId: string = DEFAULT_FILTERS.stateId,
): Promise<ResponseSummaryCounts> {
  await delay(300);
  const scope = await resolveScope(stateId);
  const all = collect(scope, "all");
  const count = (stage: ResponseStatus) =>
    all.filter((r) => r.status === stage).length;
  return {
    total: all.length,
    directed: count("directed"),
    reviewing: count("reviewing"),
    monitoring: count("monitoring"),
    escalated: count("escalated"),
    response: count("response"),
    resolved: count("resolved"),
  };
}

/**
 * Derive the list status from a returned response list (excluding
 * loading/error/session states, which are driven by the fetch lifecycle).
 */
export function deriveResponseStatus(
  list: ResponseRecord[],
): "ready" | "empty" {
  return list.length === 0 ? "empty" : "ready";
}

/**
 * Fetch aggregate responses for the selected workflow stage.
 *
 * Returns: AGGREGATE, operational responses only. Each record's LGA is
 * resolved and validated through the shared geography service.
 * Throws: ResponseServiceError("unauthorized") for an unknown State.
 *
 * TODO(DEV3): Replace with the real response pipeline.
 * TODO(DEV4): The unauthorized / session-expired UI states are driven by the
 *   server-side session + jurisdiction boundary at the route, NOT by this mock
 *   adapter, which must never signal auth outcomes on its own.
 */
export async function getResponses(
  filters: ResponseFilters,
): Promise<ResponseRecord[]> {
  await delay(420);
  const scope = await resolveScope(filters.stateId);
  return collect(scope, filters.stage);
}

/* ------------------------------------------------------------------ *
 * Detail (single response) — aggregate + authorized information.
 * ------------------------------------------------------------------ */

export interface ResponseTimelineEvent {
  id: string;
  kind: "status" | "reassignment" | "note";
  /** Set for status transitions — which stage the response moved into. */
  stage?: ResponseStatus;
  title: string;
  /** Operational officer or team that logged the event — never a citizen. */
  actor: string;
  at: string;
  description: string;
}

export interface ResponseDetail {
  id: string;
  /** Response reference used by the portal, e.g. "RSP-2026-002". */
  key: string;
  title: string;
  /** Aggregate signal wording the response was directed from. */
  signal: string;
  status: ResponseStatus;
  assignedTo: string;
  lastUpdated: string;
  stateId: string;
  stateName: string;
  lgaId: string;
  lgaName: string;
  /** The stage currently selected is the response's live workflow position. */
  directedOn: string;
  /** Ordered workflow events — status transitions plus operational notes. */
  timeline: ResponseTimelineEvent[];
}

export type ResponseDetailState =
  | "loading"
  | "ready"
  | "empty"
  | "error";

/**
 * Placeholder principal for authoring notes until a real session exists.
 * TODO(DEV4): replace with the authenticated officer principal.
 */
const MOCK_CURRENT_OFFICER = "Operations Officer";

/*
 * Deterministic helpers used to derive a dev timeline. No private data is
 * involved — only aggregate stage transitions and timestamps.
 */

/** "Sep 16, 2026" — rendered from UTC components so server/browser agree. */
const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatResponseDate(iso: string): string {
  const date = new Date(iso);
  return `${MONTH_ABBREVIATIONS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function formatResponseDateTime(iso: string): string {
  const date = new Date(iso);
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${formatResponseDate(iso)}, ${hours}:${minutes}`;
}

/** Deterministic timestamps between the directed-on and last-updated instants. */
function interpolateAt(
  startIso: string,
  endIso: string,
  slot: number,
  totalSlots: number,
): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (totalSlots <= 1) {
    return endIso;
  }
  const t = start + ((end - start) * slot) / (totalSlots - 1);
  return new Date(t).toISOString();
}

/**
 * Build the timeline for a response: a "directed" event plus one event per
 * stage the response has reached, clocked between `directedOn` and
 * `lastUpdated`. Deterministic — nothing in this block contains individual
 * records.
 */
function buildTimeline(
  seed: ResponseSeed,
  assignedTo: string,
): ResponseTimelineEvent[] {
  const reachedIndex = stageIndex(seed.status);
  const events: ResponseTimelineEvent[] = [];
  for (let i = 0; i <= reachedIndex; i += 1) {
    const stage = RESPONSE_STAGES[i];
    const at =
      i === 0
        ? seed.directedOn
        : interpolateAt(seed.directedOn, seed.lastUpdated, i, reachedIndex + 1);
    events.push({
      id: `${seed.id}-stage-${i}`,
      kind: "status",
      stage: stage.value,
      title: i === 0 ? "Response directed" : `Moved to ${stage.label}`,
      actor: assignedTo,
      at,
      description: stage.description,
    });
  }
  return events;
}

/**
 * Internal: validate the response through the shared geography scope and
 * assemble its aggregate detail payload.
 */
async function loadDetail(id: string): Promise<ResponseDetail | null> {
  const scope = await resolveScope(DEFAULT_FILTERS.stateId);
  const seed = RESPONSE_SEEDS.find((record) => record.id === id);
  if (!seed) {
    return null;
  }
  const lga = scope.lgas.get(seed.lgaId);
  if (!lga) {
    throw new ResponseServiceError(
      "unauthorized",
      "This response is outside your authorized jurisdiction.",
    );
  }
  const title = DETAIL_TITLES[seed.id];
  if (!title) {
    return null;
  }
  return {
    id: seed.id,
    key: `RSP-2026-${seed.id.replace("rsp-", "")}`,
    title,
    signal: seed.signal,
    status: seed.status,
    assignedTo: seed.assignedTo,
    lastUpdated: seed.lastUpdated,
    stateId: seed.stateId,
    stateName: scope.stateName,
    lgaId: seed.lgaId,
    lgaName: lga.name,
    directedOn: seed.directedOn,
    timeline: buildTimeline(seed, seed.assignedTo),
  };
}

/**
 * Load a single aggregate response by reference. Returns null for an unknown
 * reference so the route can show a not-found state; throws "unauthorized"
 * when the response would fall outside the officer's authorized jurisdiction
 * (backend remains authoritative for real access).
 *
 * TODO(DEV3): Replace with the real response pipeline keyed by id.
 * TODO(DEV4): This adapter must never signal auth outcomes on its own — the
 *   server-side session + jurisdiction boundary drives unauthorized/forbidden.
 */
export async function getResponseById(
  id: string,
): Promise<ResponseDetail | null> {
  await delay(380);
  return loadDetail(id);
}

/**
 * Advance a response to the next workflow stage (Directed → Reviewing →
 * Monitoring → Escalated → Response → Resolved). Forward-only; a resolved
 * response stays resolved. Returns the updated aggregate detail (or null for
 * an unknown reference). The same store drives the list, so the updated stage
 * is reflected across the portal.
 *
 * TODO(DEV3): Replace with the real response pipeline.
 */
export async function advanceResponseStatus(
  id: string,
): Promise<ResponseDetail | null> {
  await delay(340);
  const seed = RESPONSE_SEEDS.find((record) => record.id === id);
  if (!seed) {
    return null;
  }
  const next = nextResponseStage(seed.status);
  if (!next) {
    return loadDetail(id);
  }
  seed.status = next;
  seed.lastUpdated = new Date().toISOString();
  return loadDetail(id);
}

/**
 * Reassign the response to another operational officer (or back to the team
 * leads). Returns the updated aggregate detail (or null for an unknown
 * reference).
 *
 * TODO(DEV3): Replace with the real response pipeline.
 */
export async function reassignResponse(
  id: string,
  officer: string,
): Promise<ResponseDetail | null> {
  await delay(340);
  const seed = RESPONSE_SEEDS.find((record) => record.id === id);
  if (!seed) {
    return null;
  }
  seed.assignedTo = officer;
  seed.lastUpdated = new Date().toISOString();
  const detail = await loadDetail(id);
  if (!detail) {
    return null;
  }
  detail.timeline = [
    ...detail.timeline,
    {
      id: `ev-reassign-${Date.now()}`,
      kind: "reassignment",
      title: "Response reassigned",
      actor: MOCK_CURRENT_OFFICER,
      at: new Date().toISOString(),
      description: `Response reassigned to ${officer} for the ${detail.lgaName} LGA area.`,
    },
  ];
  return detail;
}

/**
 * Append an internal operational note. Notes are visible only inside the
 * portal and never describe a citizen. Rejects an empty body.
 *
 * TODO(DEV3): Replace with the real response pipeline.
 * TODO(DEV4): Author the note with the authenticated officer principal.
 */
export async function addResponseNote(
  id: string,
  body: string,
): Promise<ResponseDetail | null> {
  await delay(360);
  const seed = RESPONSE_SEEDS.find((record) => record.id === id);
  if (!seed) {
    return null;
  }
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Note text must not be empty.");
  }
  seed.lastUpdated = new Date().toISOString();
  const detail = await loadDetail(id);
  if (!detail) {
    return null;
  }
  detail.timeline = [
    ...detail.timeline,
    {
      id: `ev-note-${Date.now()}`,
      kind: "note",
      title: "Note added",
      actor: MOCK_CURRENT_OFFICER,
      at: new Date().toISOString(),
      description: trimmed,
    },
  ];
  return detail;
}