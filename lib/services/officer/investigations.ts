/**
 * Officer Investigations - aggregate investigation service (mock).
 *
 * SECURITY / PRIVACY CONTRACT (DEV4):
 * - This module returns ONLY aggregate, operational investigation records:
 *   aggregate signal wording, jurisdiction area, workflow status, the assigned
 *   officer, and the last-updated timestamp. No citizen names, citizen ids,
 *   phone numbers, exact addresses, individual health records, or raw citizen
 *   submissions are ever produced here.
 * - The assigned officer (e.g. "Dr. Adebayo") is the operational investigator
 *   â€” an authorized officer of the portal â€” never a citizen.
 * - Location identifiers are validated through the shared geography service,
 *   so an LGA can never be attached to the wrong State and no second geography
 *   list exists.
 * - The backend/auth layer (DEV4) remains the authoritative jurisdiction
 *   boundary for what the current officer may actually access.
 *
 * Status model (does not redefine the server enum â€” see server/models/
 * Investigation "open | in_progress | closed"; the granular workflow statuses
 * below partition into the portal's operational tabs):
 *   Tab "Active"   = reviewing, investigating, monitoring
 *   Tab "Pending"  = new
 *   Tab "Escalated" = escalated
 *   Tab "Closed"   = closed
 *
 * TODO(DEV3): Replace the mock bodies below with the real investigations
 *   pipeline (server/services/investigations). The signatures and types are
 *   the contract.
 * TODO(DEV4): Scope by authenticated officer jurisdiction and enforce
 *   authorization at the server entry point before any investigation returns.
 */

import { geographyService } from "./geography";
import type { GeographyLga } from "./geography";

export type InvestigationStatus =
  | "new"
  | "reviewing"
  | "investigating"
  | "monitoring"
  | "escalated"
  | "closed";

export type InvestigationTab =
  | "all"
  | "active"
  | "pending"
  | "escalated"
  | "closed";

export const STATUS_LABELS: Record<InvestigationStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  investigating: "Investigating",
  monitoring: "Monitoring",
  escalated: "Escalated",
  closed: "Closed",
};

export const STATUS_OPTIONS: ReadonlyArray<{
  value: InvestigationStatus;
  label: string;
}> = Object.keys(STATUS_LABELS).map((value) => ({
  value: value as InvestigationStatus,
  label: STATUS_LABELS[value as InvestigationStatus],
}));

/** Tabs shown above the list; counts are derived from service data. */
export const TABS: ReadonlyArray<{ value: InvestigationTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
];

const TAB_STATUS_GROUPS: Record<
  Exclude<InvestigationTab, "all">,
  readonly InvestigationStatus[]
> = {
  active: ["reviewing", "investigating", "monitoring"],
  pending: ["new"],
  escalated: ["escalated"],
  closed: ["closed"],
};

/** Whether an investigation status falls under the given tab. */
export function statusMatchesTab(
  status: InvestigationStatus,
  tab: InvestigationTab,
): boolean {
  if (tab === "all") {
    return true;
  }
  return TAB_STATUS_GROUPS[tab].includes(status);
}

/**
 * The distinct tab an investigation's status lives under â€” used (for example)
 * to point a detail page's "Back to investigations" link back at the matching
 * list tab so the selected investigation stays visible in context.
 */
export function tabForStatus(status: InvestigationStatus): InvestigationTab {
  const tabs: ReadonlyArray<Exclude<InvestigationTab, "all">> = [
    "active",
    "pending",
    "escalated",
    "closed",
  ];
  for (const tab of tabs) {
    if (statusMatchesTab(status, tab)) {
      return tab;
    }
  }
  return "all";
}

export interface InvestigationFilters {
  stateId: string;
  tab: InvestigationTab;
}

export const DEFAULT_FILTERS: InvestigationFilters = {
  stateId: "osun",
  tab: "all",
};

export interface Investigation {
  id: string;
  /** Aggregate signal wording, e.g. "Fever + Cough" â€” never a citizen report. */
  signal: string;
  stateId: string;
  stateName: string;
  /** Shared geography LGA id, e.g. "ife-central". */
  lgaId: string;
  lgaName: string;
  status: InvestigationStatus;
  /** Assigned officer (operational portal user), never a citizen. */
  assignedTo: string;
  lastUpdated: string;
}

export interface InvestigationSummaryCounts {
  all: number;
  active: number;
  pending: number;
  escalated: number;
  closed: number;
}

export type InvestigationDataStatus =
  | "loading"
  | "ready"
  | "empty"
  | "unauthorized"
  | "session-expired"
  | "error";

export class InvestigationsServiceError extends Error {
  constructor(
    public code: "unauthorized" | "network",
    message?: string,
  ) {
    super(message);
    this.name = "InvestigationsServiceError";
  }
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Dev aggregate investigation records â€” all structurally valid Osun State
 * geography. Counts partition as 6 active / 3 pending / 2 escalated / 1 closed
 * = 12 total so the portal tabs aggregate honestly from service data.
 */
const INVESTIGATIONS: Omit<Investigation, "stateName" | "lgaName">[] = [
  {
    id: "inv-001",
    signal: "Fever + Cough",
    stateId: "osun",
    lgaId: "ife-central",
    status: "reviewing",
    assignedTo: "Dr. Adebayo",
    lastUpdated: "2026-09-16T10:15:00Z",
  },
  {
    id: "inv-002",
    signal: "Diabetes + Headache",
    stateId: "osun",
    lgaId: "ife-central",
    status: "new",
    assignedTo: "Dr. Enola",
    lastUpdated: "2026-09-15T16:40:00Z",
  },
  {
    id: "inv-003",
    signal: "Diarrhea increase",
    stateId: "osun",
    lgaId: "ife-central",
    status: "monitoring",
    assignedTo: "Dr. Adebayo",
    lastUpdated: "2026-09-15T09:05:00Z",
  },
  {
    id: "inv-004",
    signal: "Rash cluster",
    stateId: "osun",
    lgaId: "ife-south",
    status: "escalated",
    assignedTo: "Dr. Kemi",
    lastUpdated: "2026-09-14T14:55:00Z",
  },
  {
    id: "inv-005",
    signal: "Respiratory symptoms increase",
    stateId: "osun",
    lgaId: "ife-central",
    status: "investigating",
    assignedTo: "Dr. Adebayo",
    lastUpdated: "2026-09-14T08:30:00Z",
  },
  {
    id: "inv-006",
    signal: "Typhoid-like cluster",
    stateId: "osun",
    lgaId: "ife-south",
    status: "reviewing",
    assignedTo: "Dr. Tunde",
    lastUpdated: "2026-09-16T12:20:00Z",
  },
  {
    id: "inv-007",
    signal: "Cholera-like diarrhoea reports",
    stateId: "osun",
    lgaId: "ife-east",
    status: "investigating",
    assignedTo: "Dr. Ifeoma",
    lastUpdated: "2026-09-16T07:45:00Z",
  },
  {
    id: "inv-008",
    signal: "Malaria-like fever â€” ward cluster",
    stateId: "osun",
    lgaId: "ife-north",
    status: "monitoring",
    assignedTo: "Dr. Ifeoma",
    lastUpdated: "2026-09-12T18:10:00Z",
  },
  {
    id: "inv-009",
    signal: "Unexplained rash reports",
    stateId: "osun",
    lgaId: "ife-south",
    status: "new",
    assignedTo: "Dr. Enola",
    lastUpdated: "2026-09-16T11:30:00Z",
  },
  {
    id: "inv-010",
    signal: "Eye irritation cluster",
    stateId: "osun",
    lgaId: "ife-east",
    status: "new",
    assignedTo: "Dr. Kemi",
    lastUpdated: "2026-09-16T06:50:00Z",
  },
  {
    id: "inv-011",
    signal: "Acute respiratory surge",
    stateId: "osun",
    lgaId: "ilesha-west",
    status: "escalated",
    assignedTo: "Dr. Ifeoma",
    lastUpdated: "2026-09-16T09:10:00Z",
  },
  {
    id: "inv-012",
    signal: "Typhoid cluster â€” resolved",
    stateId: "osun",
    lgaId: "ife-central",
    status: "closed",
    assignedTo: "Dr. Adebayo",
    lastUpdated: "2026-09-10T13:00:00Z",
  },
];

/**
 * Validate the officer's jurisdictional State through the shared geography
 * service and return its LGA lookup. An unknown State throws the same
 * restricted-jurisdiction error used by the map and explorer services.
 */
async function resolveScope(
  stateId: string,
): Promise<{ stateName: string; lgas: Map<string, GeographyLga> }> {
  const state = stateId
    ? await geographyService.getStateById(stateId)
    : null;
  if (!state) {
    throw new InvestigationsServiceError(
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

function collect(
  scope: { stateName: string; lgas: Map<string, GeographyLga> },
  tab: InvestigationTab,
): Investigation[] {
  const list: Investigation[] = [];
  for (const raw of INVESTIGATIONS) {
    const lga = scope.lgas.get(raw.lgaId);
    if (!lga) {
      // Structurally impossible holder â€” skip rather than invent a location.
      continue;
    }
    if (!statusMatchesTab(raw.status, tab)) {
      continue;
    }
    list.push({
      ...raw,
      stateName: scope.stateName,
      lgaName: lga.name,
    });
  }
  return list;
}

/**
 * Jurisdiction-wide investigation counts per status tab.
 * TODO(DEV3): Replace with a real aggregation over the investigations store.
 */
export async function getInvestigationSummary(
  stateId: string = DEFAULT_FILTERS.stateId,
): Promise<InvestigationSummaryCounts> {
  await delay(300);
  const scope = await resolveScope(stateId);
  const all = collect(scope, "all");
  return {
    all: all.length,
    active: all.filter((i) => statusMatchesTab(i.status, "active")).length,
    pending: all.filter((i) => statusMatchesTab(i.status, "pending")).length,
    escalated: all.filter((i) => statusMatchesTab(i.status, "escalated")).length,
    closed: all.filter((i) => statusMatchesTab(i.status, "closed")).length,
  };
}

/**
 * Derive the list status from a returned investigation list (excluding
 * loading/error/session states, which are driven by the fetch lifecycle).
 */
export function deriveInvestigationStatus(
  list: Investigation[],
): "ready" | "empty" {
  return list.length === 0 ? "empty" : "ready";
}

/**
 * Fetch aggregate investigations for the selected status tab.
 *
 * Returns: AGGREGATE, operational investigations only. No citizen-level
 * records. Each record's LGA is resolved and validated through the shared
 * geography service.
 * Throws: InvestigationsServiceError("unauthorized") for an unknown State.
 *
 * TODO(DEV3): Replace with the real investigations pipeline.
 * TODO(DEV4): The unauthorized / session-expired UI states are driven by the
 *   server-side session + jurisdiction boundary at the route, NOT by this mock
 *   adapter, which must never signal auth outcomes on its own.
 */
export async function getInvestigations(
  filters: InvestigationFilters,
): Promise<Investigation[]> {
  await delay(420);
  const scope = await resolveScope(filters.stateId);
  return collect(scope, filters.tab);
}

/* ------------------------------------------------------------------ *
 * Detail (single investigation) — aggregate + authorized information.
 * ------------------------------------------------------------------ */

export type InvestigationPriority = "high" | "medium" | "low";

export const PRIORITY_LABELS: Record<InvestigationPriority, string> = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

export type InvestigationConfidence = "high" | "medium" | "low";

export const CONFIDENCE_LABELS: Record<InvestigationConfidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export interface InvestigationTrendPoint {
  /** ISO date for the bucket (UTC). */
  date: string;
  /** Short display label, e.g. "Sep 3". */
  label: string;
  /** Aggregate daily signal count. Minimum visible daily value is 3. */
  current: number;
  /** Aggregate daily baseline count for the same jurisdiction area. */
  baseline: number;
}

export interface InvestigationNote {
  id: string;
  /** Operational officer or team that authored the note — never a citizen. */
  author: string;
  createdAt: string;
  body: string;
}

export interface InvestigationDetail {
  id: string;
  /** Signal reference used by the portal, e.g. "SIG-2026-001". */
  key: string;
  title: string;
  detectedOn: string;
  priority: InvestigationPriority;
  status: InvestigationStatus;
  assignedTo: string;
  lastUpdated: string;
  stateId: string;
  stateName: string;
  lgaId: string;
  lgaName: string;
  timeWindow: { start: string; end: string };
  /** Aggregate report count over the reporting window. */
  totalReports: number;
  /** Derived from the current-vs-baseline trend (e.g. 62 renders "+62%"). */
  changeFromBaselinePercent: number;
  confidence: InvestigationConfidence;
  /** Aggregate daily trend — last 14 days, current + baseline series. */
  trend: InvestigationTrendPoint[];
  /** Operational notes (aggregate, authorized officers only). */
  notes: InvestigationNote[];
}

export type InvestigationDetailState =
  | "loading"
  | "ready"
  | "empty"
  | "error";

/** Teams an officer may assign an investigation to (operational roster). */
export const ASSIGNMENT_TEAMS: ReadonlyArray<string> = [
  "Epidemiology Team",
  "Rapid Response Team",
  "Community Health Team",
  "Laboratory Team",
];

/**
 * Placeholder principal for authoring notes until a real session exists.
 * TODO(DEV4): replace with the authenticated officer principal.
 */
const MOCK_CURRENT_OFFICER = "Operations Officer";

interface DetailMeta {
  title: string;
  priority: InvestigationPriority;
  detectedOn: string;
  timeWindow: { start: string; end: string };
  totalReports: number;
  confidence: InvestigationConfidence;
  seed: number;
}

/**
 * Dev detail metadata per investigation: rendering the reporting window,
 * priority, confidence and the aggregate report total for each context.
 * Trend series and baseline change are DERIVED deterministically via
 * buildTrend — nothing in this block contains individual records.
 */
const DETAIL_META: Record<string, DetailMeta> = {
  "inv-001": {
    title: "Fever + Cough increase in Ife Central LGA",
    priority: "high",
    detectedOn: "2026-09-14T08:00:00Z",
    timeWindow: { start: "2026-09-12T00:00:00Z", end: "2026-09-16T23:59:59Z" },
    totalReports: 47,
    confidence: "high",
    seed: 11,
  },
  "inv-002": {
    title: "Diabetes + Headache reports in Ife Central LGA",
    priority: "medium",
    detectedOn: "2026-09-15T16:40:00Z",
    timeWindow: { start: "2026-09-11T00:00:00Z", end: "2026-09-15T23:59:59Z" },
    totalReports: 24,
    confidence: "medium",
    seed: 27,
  },
  "inv-003": {
    title: "Diarrhoea activity rise in Ife Central LGA",
    priority: "medium",
    detectedOn: "2026-09-15T09:05:00Z",
    timeWindow: { start: "2026-09-11T00:00:00Z", end: "2026-09-15T23:59:59Z" },
    totalReports: 31,
    confidence: "medium",
    seed: 33,
  },
  "inv-004": {
    title: "Rash cluster in Ife South LGA",
    priority: "high",
    detectedOn: "2026-09-12T06:30:00Z",
    timeWindow: { start: "2026-09-08T00:00:00Z", end: "2026-09-14T23:59:59Z" },
    totalReports: 18,
    confidence: "high",
    seed: 41,
  },
  "inv-005": {
    title: "Respiratory symptoms increase in Ife Central LGA",
    priority: "medium",
    detectedOn: "2026-09-14T08:30:00Z",
    timeWindow: { start: "2026-09-10T00:00:00Z", end: "2026-09-14T23:59:59Z" },
    totalReports: 36,
    confidence: "medium",
    seed: 53,
  },
  "inv-006": {
    title: "Typhoid-like cluster in Ife South LGA",
    priority: "high",
    detectedOn: "2026-09-13T12:20:00Z",
    timeWindow: { start: "2026-09-06T00:00:00Z", end: "2026-09-13T23:59:59Z" },
    totalReports: 21,
    confidence: "high",
    seed: 59,
  },
  "inv-007": {
    title: "Cholera-like diarrhoea reports in Ife East LGA",
    priority: "high",
    detectedOn: "2026-09-12T07:45:00Z",
    timeWindow: { start: "2026-09-06T00:00:00Z", end: "2026-09-12T23:59:59Z" },
    totalReports: 28,
    confidence: "medium",
    seed: 67,
  },
  "inv-008": {
    title: "Malaria-like fever cluster in Ife North LGA",
    priority: "low",
    detectedOn: "2026-09-11T18:10:00Z",
    timeWindow: { start: "2026-09-07T00:00:00Z", end: "2026-09-11T23:59:59Z" },
    totalReports: 15,
    confidence: "low",
    seed: 71,
  },
  "inv-009": {
    title: "Rash reports under review in Ife South LGA",
    priority: "medium",
    detectedOn: "2026-09-16T11:30:00Z",
    timeWindow: { start: "2026-09-12T00:00:00Z", end: "2026-09-16T23:59:59Z" },
    totalReports: 15,
    confidence: "low",
    seed: 79,
  },
  "inv-010": {
    title: "Eye irritation cluster in Ife East LGA",
    priority: "low",
    detectedOn: "2026-09-16T06:50:00Z",
    timeWindow: { start: "2026-09-12T00:00:00Z", end: "2026-09-16T23:59:59Z" },
    totalReports: 15,
    confidence: "low",
    seed: 83,
  },
  "inv-011": {
    title: "Acute respiratory surge in Ilesha West LGA",
    priority: "high",
    detectedOn: "2026-09-14T09:10:00Z",
    timeWindow: { start: "2026-09-10T00:00:00Z", end: "2026-09-16T23:59:59Z" },
    totalReports: 44,
    confidence: "high",
    seed: 89,
  },
  "inv-012": {
    title: "Typhoid cluster in Ife Central LGA",
    priority: "medium",
    detectedOn: "2026-09-08T13:00:00Z",
    timeWindow: { start: "2026-09-02T00:00:00Z", end: "2026-09-08T23:59:59Z" },
    totalReports: 19,
    confidence: "medium",
    seed: 97,
  },
};

/** Operational notes — aggregate, authored by authorized portal users only. */
const NOTES: Record<string, InvestigationNote[]> = {
  "inv-001": [
    {
      id: "note-101",
      author: "Dr. Adebayo",
      createdAt: "2026-09-14T09:00:00Z",
      body: "Initial aggregate review complete. Community field verification has been scheduled.",
    },
    {
      id: "note-102",
      author: "Dr. Enola",
      createdAt: "2026-09-15T08:15:00Z",
      body: "Community sampling is underway across Ife Central wards.",
    },
  ],
  "inv-004": [
    {
      id: "note-201",
      author: "Dr. Kemi",
      createdAt: "2026-09-13T10:30:00Z",
      body: "Escalated to the state office for wider coordination.",
    },
  ],
  "inv-011": [
    {
      id: "note-301",
      author: "Dr. Ifeoma",
      createdAt: "2026-09-14T15:40:00Z",
      body: "Capacity check requested with referral facilities in Ilesha West.",
    },
  ],
};

/* Date helpers used to build chart labels and the reporting window string.
 * Formatted from the UTC components explicitly so the server and the browser
 * always render identical dates (stable SSR + hydration, deterministic tests). */

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

export function formatInvestigationDay(iso: string): string {
  const date = new Date(iso);
  return `${MONTH_ABBREVIATIONS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function formatInvestigationDate(iso: string): string {
  const date = new Date(iso);
  return `${MONTH_ABBREVIATIONS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** "Sep 12 → Sep 16, 2026" — start short form, end includes the year. */
export function formatInvestigationRange(start: string, end: string): string {
  return `${formatInvestigationDay(start)} → ${formatInvestigationDate(end)}`;
}

/**
 * Deterministic scatter used so the dev trend is stable across renders and
 * tests — no Math.random() in the data layer.
 */
function hash(seed: number, index: number): number {
  const x = Math.sin(seed * 127.1 + index * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Split an aggregate total across the window's daily buckets: every bucket is
 * a whole count and the buckets always sum exactly to `total`. Guaranteed to
 * terminate for any non-negative total (base + finite remainder sweep), so a
 * future pipeline value can never hang the detail page. Buckets never exceed
 * `total`. Daily values only stay inside the 3+ privacy floor when the total
 * itself is large enough to be representable in these slots; the flat mock
 * authoring keeps every window total at or above the floor.
 */
function distributeTotal(total: number, slots: number, seed: number): number[] {
  const base = Math.floor(total / slots);
  const out = Array.from({ length: slots }, () => base);
  let remainder = total % slots;
  let cursor = 0;
  while (remainder > 0) {
    out[cursor] += 1;
    remainder -= 1;
    cursor = (cursor + 1) % slots;
  }
  if (hash(seed, 0) > 0.5 && slots > 1 && base > 1 && out[0] > 3 && out[1] < total) {
    out[0] -= 1;
    out[1] += 1;
  }
  return out;
}

/**
 * Build the last-14-days aggregate trend for an investigation: current daily
 * counts whose final five days sum exactly to the window's total, plus a
 * deterministic daily baseline. The reported "change from baseline" is
 * DERIVED from these two series so the summary and the chart always agree.
 */
function buildTrend(
  meta: DetailMeta,
): { points: InvestigationTrendPoint[]; changeFromBaselinePercent: number } {
  const DAYS = 14;
  const WINDOW_DAYS = 5;
  const end = new Date(meta.detectedOn);
  const lastCurrent = distributeTotal(meta.totalReports, WINDOW_DAYS, meta.seed);
  const baselineOf = (index: number) =>
    4 + Math.floor(hash(meta.seed, index) * 4);
  const currentOf = (index: number) => {
    if (index >= DAYS - WINDOW_DAYS) {
      return lastCurrent[index - (DAYS - WINDOW_DAYS)];
    }
    const bump = Math.floor(hash(meta.seed, index * 7 + 3) * 3);
    return Math.max(3, baselineOf(index) + bump - 1);
  };

  const points: InvestigationTrendPoint[] = [];
  for (let offset = DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - offset);
    const iso = date.toISOString();
    const index = DAYS - 1 - offset;
    points.push({
      date: iso,
      label: formatInvestigationDay(iso),
      current: currentOf(index),
      baseline: baselineOf(index),
    });
  }

  const window = points.slice(-WINDOW_DAYS);
  const currentMean =
    window.reduce((sum, point) => sum + point.current, 0) / WINDOW_DAYS;
  const baselineMean =
    window.reduce((sum, point) => sum + point.baseline, 0) / WINDOW_DAYS;
  const changeFromBaselinePercent = Math.round(
    (currentMean / baselineMean - 1) * 100,
  );

  return { points, changeFromBaselinePercent };
}

function buildDetail(
  base: Omit<Investigation, "stateName" | "lgaName">,
  stateName: string,
  lgaName: string,
  meta: DetailMeta,
): InvestigationDetail {
  const { points, changeFromBaselinePercent } = buildTrend(meta);
  return {
    id: base.id,
    key: `SIG-2026-${base.id.replace("inv-", "")}`,
    title: meta.title,
    detectedOn: meta.detectedOn,
    priority: meta.priority,
    status: base.status,
    assignedTo: base.assignedTo,
    lastUpdated: base.lastUpdated,
    stateId: base.stateId,
    stateName,
    lgaId: base.lgaId,
    lgaName,
    timeWindow: meta.timeWindow,
    totalReports: meta.totalReports,
    changeFromBaselinePercent,
    confidence: meta.confidence,
    trend: points,
    notes: NOTES[base.id] ?? [],
  };
}

/**
 * Internal: validate the investigation through the shared geography scope and
 * assemble its aggregate detail payload.
 */
async function loadDetail(id: string): Promise<InvestigationDetail | null> {
  const scope = await resolveScope(DEFAULT_FILTERS.stateId);
  const base = INVESTIGATIONS.find((record) => record.id === id);
  if (!base) {
    return null;
  }
  const lga = scope.lgas.get(base.lgaId);
  if (!lga) {
    throw new InvestigationsServiceError(
      "unauthorized",
      "This investigation is outside your authorized jurisdiction.",
    );
  }
  const meta = DETAIL_META[base.id];
  if (!meta) {
    return null;
  }
  return buildDetail(base, scope.stateName, lga.name, meta);
}

/**
 * Load a single aggregate investigation by reference. Returns null for an
 * unknown reference so the route can show a not-found state; throws
 * "unauthorized" when the investigation would fall outside the officer's
 * authorized jurisdiction (backend remains authoritative for real access).
 *
 * TODO(DEV3): Replace with the real investigations pipeline keyed by id.
 * TODO(DEV4): This adapter must never signal auth outcomes on its own — the
 *   server-side session + jurisdiction boundary drives unauthorized/forbidden.
 */
export async function getInvestigationById(
  id: string,
): Promise<InvestigationDetail | null> {
  await delay(380);
  return loadDetail(id);
}

/**
 * Set the workflow status for an investigation (escalate / monitor / close).
 * Returns the updated aggregate detail (or null for an unknown reference).
 * The same store drives the list, so the updated status is reflected across
 * the portal's tabs.
 *
 * TODO(DEV3): Replace with the real investigations pipeline.
 */
export async function setInvestigationStatus(
  id: string,
  status: InvestigationStatus,
): Promise<InvestigationDetail | null> {
  await delay(340);
  const base = INVESTIGATIONS.find((record) => record.id === id);
  if (!base) {
    return null;
  }
  base.status = status;
  base.lastUpdated = new Date().toISOString();
  return loadDetail(id);
}

/**
 * Assign the investigation to an operational team (or reassign it).
 * Returns the updated aggregate detail (or null for an unknown reference).
 *
 * TODO(DEV3): Replace with the real investigations pipeline.
 */
export async function setInvestigationAssignedTo(
  id: string,
  assignment: string,
): Promise<InvestigationDetail | null> {
  await delay(340);
  const base = INVESTIGATIONS.find((record) => record.id === id);
  if (!base) {
    return null;
  }
  base.assignedTo = assignment;
  base.lastUpdated = new Date().toISOString();
  return loadDetail(id);
}

/**
 * Append an internal operational note. Notes are visible only inside the
 * portal and never describe a citizen. Rejects an empty body.
 *
 * TODO(DEV3): Replace with the real investigations pipeline.
 * TODO(DEV4): Author the note with the authenticated officer principal.
 */
export async function addInvestigationNote(
  id: string,
  body: string,
): Promise<InvestigationDetail | null> {
  await delay(360);
  const base = INVESTIGATIONS.find((record) => record.id === id);
  if (!base) {
    return null;
  }
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Note text must not be empty.");
  }
  const current = NOTES[base.id] ?? [];
  NOTES[base.id] = [
    ...current,
    {
      id: `note-${Date.now()}-${current.length}`,
      author: MOCK_CURRENT_OFFICER,
      createdAt: new Date().toISOString(),
      body: trimmed,
    },
  ];
  base.lastUpdated = new Date().toISOString();
  return loadDetail(id);
}