/**
 * Officer Public Health Alerts — aggregate public-alert service (mock adapter).
 *
 * SECURITY / PRIVACY CONTRACT (DEV4):
 * - This module returns ONLY public-health messaging and its operational
 *   metadata: alert title/body, aggregate area (validated through the shared
 *   geography service), publishing status, publication date, level, channels,
 *   and the officer-typed audience. No citizen names, citizen ids, phone
 *   numbers, exact addresses, individual records, or raw submissions are ever
 *   produced here.
 * - Areas use the shared State → LGA geography system. An LGA can never be
 *   attached to the wrong State and no second geography list exists here.
 * - The backend/auth layer (DEV4) remains the authoritative jurisdiction
 *   boundary for what the current officer may actually access.
 *
 * Status model (frontend contract — the portal's alert lifecycle):
 *   draft → under-review → published, with published alerts that age out of
 *   circulation shown as expired. TODO(DEV3): converge with the server enum
 *   (server/models/PublicAlert currently stubs "draft | published | withdrawn")
 *   via the serialized contract.
 *
 * TODO(DEV3): Replace the mock bodies below with the real public-alert
 *   publishing service (server/services/public-alerts). The signatures and
 *   types are the contract. Alerts are authored/published server-side so the
 *   browser never talks to MongoDB.
 * TODO(DEV4): Scope by authenticated officer jurisdiction and enforce
 *   authorization at the server entry point before any alert returns.
 */

import { geographyService } from "./geography";
import type { GeographyLga } from "./geography";

export type PublicAlertStatus =
  | "draft"
  | "under-review"
  | "published"
  | "expired";

export type PublicAlertLevel = "info" | "watch" | "warning" | "critical";

export type PublicAlertChannel = "sms" | "push" | "web" | "ussd";

/** Tab set for the alert list — one tab per lifecycle status. */
export type PublicAlertTab = PublicAlertStatus;

export const STATUS_LABELS: Record<PublicAlertStatus, string> = {
  draft: "Draft",
  "under-review": "Under Review",
  published: "Published",
  expired: "Expired",
};

export const TABS: ReadonlyArray<{ value: PublicAlertTab; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "under-review", label: "Under Review" },
  { value: "published", label: "Published" },
  { value: "expired", label: "Expired" },
];

export const LEVEL_LABELS: Record<PublicAlertLevel, string> = {
  info: "Information",
  watch: "Watch",
  warning: "Warning",
  critical: "Critical",
};

export const CHANNEL_LABELS: Record<PublicAlertChannel, string> = {
  sms: "SMS",
  push: "App push",
  web: "Web",
  ussd: "USSD",
};

/** Publishing channels an officer may target (operational selector). */
export const CHANNEL_OPTIONS: ReadonlyArray<{
  value: PublicAlertChannel;
  label: string;
}> = Object.keys(CHANNEL_LABELS).map((value) => ({
  value: value as PublicAlertChannel,
  label: CHANNEL_LABELS[value as PublicAlertChannel],
}));

export interface PublicAlertRecord {
  id: string;
  title: string;
  stateId: string;
  stateName: string;
  /** Null when the alert is State-wide rather than LGA-scoped. */
  lgaId: string | null;
  lgaName: string | null;
  status: PublicAlertStatus;
  /** Severity level driving the list urgency signal (icon + text + tone). */
  level: PublicAlertLevel;
  /** When the alert went out across channels. Null while not published. */
  publishedAt: string | null;
  lastUpdated: string;
}

export interface PublicAlertSummaryCounts {
  draft: number;
  underReview: number;
  published: number;
  expired: number;
}

/** List/detail data lifecycle for the alerts feature. */
export type PublicAlertDataStatus =
  | "loading"
  | "ready"
  | "empty"
  | "unauthorized"
  | "session-expired"
  | "error";

export type PublicAlertDetailState =
  | "loading"
  | "ready"
  | "empty"
  | "error";

export class PublicAlertsServiceError extends Error {
  constructor(
    public code: "unauthorized" | "network",
    message?: string,
  ) {
    super(message);
    this.name = "PublicAlertsServiceError";
  }
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const DEFAULT_FILTERS = {
  stateId: "osun",
  tab: "draft",
} as const;

/*
 * Dev aggregate public-alert records — all on structurally valid Osun State
 * geography. Titles mirror the portal's example rows but are authored as
 * structured records behind the service adapter, with the supporting fields
 * (level, body, channels, audience) held for the detail and create flows.
 * No citizen data anywhere in the payloads.
 */
interface PublicAlertSeed {
  id: string;
  title: string;
  stateId: string;
  lgaId: string | null;
  status: PublicAlertStatus;
  level: PublicAlertLevel;
  body: string;
  channels: PublicAlertChannel[];
  publishedAt: string | null;
  audience: string;
  createdAt: string;
  /** Last modified instant; defaults to createdAt in derived payloads. */
  lastUpdated?: string;
}

const ALERT_SEEDS: PublicAlertSeed[] = [
  {
    id: "pa-001",
    title: "Increase in Fever Cases",
    stateId: "osun",
    lgaId: "ife-central",
    status: "under-review",
    level: "watch",
    body: "Community health staff have noted an increase in fever-related cases across Ife Central wards. Residents are advised to use insecticide-treated nets, keep surroundings free of standing water, and visit their nearest health facility for early testing.",
    channels: ["web", "sms"],
    publishedAt: null,
    audience: "Ife Central residents",
    createdAt: "2026-09-16T08:30:00Z",
  },
  {
    id: "pa-002",
    title: "Prevent Mosquito Spread",
    stateId: "osun",
    lgaId: null,
    status: "published",
    level: "info",
    body: "Reduce mosquito breeding sites across Osun State: drain standing water, dispose of containers that collect rainwater, and keep water storage covered. Prevention remains the most effective protection against mosquito-borne illness.",
    channels: ["push", "sms", "web"],
    publishedAt: "2026-09-10T09:00:00Z",
    audience: "All Osun State residents",
    createdAt: "2026-09-08T07:45:00Z",
  },
  {
    id: "pa-003",
    title: "Lassa Fever Awareness",
    stateId: "osun",
    lgaId: null,
    status: "published",
    level: "warning",
    body: "Lassa fever spreads mainly through contact with rat droppings or urine. Keep food covered, store grains in rodent-proof containers, dispose of refuse promptly, and seek care immediately if you develop unexplained fever.",
    channels: ["web", "push", "ussd"],
    publishedAt: "2026-08-28T10:15:00Z",
    audience: "All Osun State residents",
    createdAt: "2026-08-25T12:20:00Z",
  },
  {
    id: "pa-004",
    title: "Cholera Prevention Tips",
    stateId: "osun",
    lgaId: "ife-central",
    status: "draft",
    level: "warning",
    body: "Drink treated or boiled water, wash hands with soap before eating and after the toilet, and report sudden watery diarrhoea to your health facility. Cholera is preventable when hygiene practices are followed.",
    channels: ["sms", "web"],
    publishedAt: null,
    audience: "Ife Central residents",
    createdAt: "2026-09-15T14:05:00Z",
  },
  {
    id: "pa-005",
    title: "Seasonal Flu Advisory",
    stateId: "osun",
    lgaId: null,
    status: "expired",
    level: "info",
    body: "Seasonal flu circulation peaks this time of year. Cover coughs and sneezes, wash hands regularly, and stay home when unwell to protect others. High-risk groups should contact their facility about vaccination.",
    channels: ["web", "sms"],
    publishedAt: "2026-07-10T08:00:00Z",
    audience: "All Osun State residents",
    createdAt: "2026-07-08T16:30:00Z",
  },
  {
    id: "pa-006",
    title: "Malaria Awareness Drive",
    stateId: "osun",
    lgaId: "ife-south",
    status: "published",
    level: "info",
    body: "Ife South communities are encouraged to sleep under treated nets and clear vegetation around homes. Early testing and treatment reduce severe malaria cases.",
    channels: ["push", "web"],
    publishedAt: "2026-09-01T12:00:00Z",
    audience: "Ife South residents",
    createdAt: "2026-08-29T09:40:00Z",
  },
  {
    id: "pa-007",
    title: "Cholera Response Update",
    stateId: "osun",
    lgaId: "ife-east",
    status: "under-review",
    level: "warning",
    body: "Draft update on ongoing cholera preparedness in Ife East: intensified hygiene messaging and distribution of safe-water guidance. Undergoing review before publication.",
    channels: ["web", "sms"],
    publishedAt: null,
    audience: "Ife East residents",
    createdAt: "2026-09-17T10:10:00Z",
  },
  {
    id: "pa-008",
    title: "Respiratory Health Advisory",
    stateId: "osun",
    lgaId: "ife-east",
    status: "draft",
    level: "watch",
    body: "Advisory on respiratory symptoms in Ife East: ventilate indoor spaces, avoid crowded gatherings when unwell, and seek care for persistent cough or difficulty breathing.",
    channels: ["web"],
    publishedAt: null,
    audience: "Ife East residents",
    createdAt: "2026-09-18T07:55:00Z",
  },
];

/**
 * Validate the officer's jurisdictional State through the shared geography
 * service and return its LGA lookup. An unknown State throws the same
 * restricted-jurisdiction error used across the other officer services.
 */
async function resolveScope(
  stateId: string,
): Promise<{ stateName: string; lgas: Map<string, GeographyLga> }> {
  const state = stateId
    ? await geographyService.getStateById(stateId)
    : null;
  if (!state) {
    throw new PublicAlertsServiceError(
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
  tab: PublicAlertTab,
): PublicAlertRecord[] {
  const list: PublicAlertRecord[] = [];
  for (const raw of ALERT_SEEDS) {
    if (raw.status !== tab) {
      continue;
    }
    let lgaName: string | null = null;
    if (raw.lgaId) {
      const lga = scope.lgas.get(raw.lgaId);
      if (!lga) {
        // Structurally impossible holder — skip rather than invent a location.
        continue;
      }
      lgaName = lga.name;
    }
    list.push({
      id: raw.id,
      title: raw.title,
      stateId: raw.stateId,
      stateName: scope.stateName,
      lgaId: raw.lgaId,
      lgaName,
      status: raw.status,
      level: raw.level,
      publishedAt: raw.publishedAt,
      lastUpdated: raw.lastUpdated ?? raw.createdAt,
    });
  }
  return list;
}

/**
 * Jurisdiction-wide alert counts per status tab. Counts are always derived
 * from service data — never hardcoded in the UI.
 * TODO(DEV3): Replace with a real aggregation over the alert store.
 */
export async function getPublicAlertSummary(
  stateId: string = DEFAULT_FILTERS.stateId,
): Promise<PublicAlertSummaryCounts> {
  await delay(300);
  const scope = await resolveScope(stateId);
  const all = ALERT_SEEDS.filter((record) => {
    // Only count records whose LGA resolves inside the authorized State.
    if (!record.lgaId) {
      return true;
    }
    return scope.lgas.has(record.lgaId);
  });
  const count = (status: PublicAlertStatus) =>
    all.filter((record) => record.status === status).length;
  return {
    draft: count("draft"),
    underReview: count("under-review"),
    published: count("published"),
    expired: count("expired"),
  };
}

/**
 * Derive the list status from a returned alert list (excluding
 * loading/error/session states, which are driven by the fetch lifecycle).
 */
export function derivePublicAlertStatus(
  list: PublicAlertRecord[],
): "ready" | "empty" {
  return list.length === 0 ? "empty" : "ready";
}

/**
 * Fetch aggregate public alerts for the selected status tab.
 * Returns: AGGREGATE, public-health alerts only. Each record's area is
 * resolved and validated through the shared geography service.
 * Throws: PublicAlertsServiceError("unauthorized") for an unknown State.
 *
 * TODO(DEV3): Replace with the real public-alert pipeline.
 * TODO(DEV4): The unauthorized / session-expired UI states are driven by the
 *   server-side session + jurisdiction boundary at the route, NOT by this mock
 *   adapter, which must never signal auth outcomes on its own.
 */
export async function getPublicAlerts(
  tab: PublicAlertTab,
  stateId: string = DEFAULT_FILTERS.stateId,
): Promise<PublicAlertRecord[]> {
  await delay(420);
  const scope = await resolveScope(stateId);
  return collect(scope, tab);
}

/**
 * The officer's authorized publishing jurisdiction (State + its LGAs) derived
 * from the shared geography service — used by the create flow for its Area
 * fields. No second geography list is created for Public Alerts.
 */
export async function getAlertJurisdiction(): Promise<{
  stateId: string;
  stateName: string;
  lgas: ReadonlyArray<{ id: string; name: string }>;
}> {
  await delay(240);
  const scope = await resolveScope(DEFAULT_FILTERS.stateId);
  return {
    stateId: DEFAULT_FILTERS.stateId,
    stateName: scope.stateName,
    lgas: Array.from(scope.lgas.values()).map((lga) => ({
      id: lga.id,
      name: lga.name,
    })),
  };
}

/* ------------------------------------------------------------------ *
 * Detail (single alert) + create (draft authoring).
 * ------------------------------------------------------------------ */

export interface PublicAlertDetail extends PublicAlertRecord {
  level: PublicAlertLevel;
  body: string;
  channels: PublicAlertChannel[];
  audience: string;
  createdAt: string;
}

export interface CreatePublicAlertInput {
  title: string;
  level: PublicAlertLevel;
  body: string;
  channels: PublicAlertChannel[];
  /** Null = State-wide alert. Must be an LGA of the authorized State. */
  lgaId: string | null;
  audience: string;
}

/** Alerts authored as drafts always start in the Draft lifecycle state. */
export type CreatePublicAlertResult = PublicAlertDetail;

/** "Sep 10, 2026" — built from UTC components so server/browser agree. */
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

export function formatPublicAlertDate(iso: string): string {
  const date = new Date(iso);
  return `${MONTH_ABBREVIATIONS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/**
 * Internal: validate the alert through the shared geography scope and assemble
 * its aggregate detail payload.
 */
async function loadDetail(id: string): Promise<PublicAlertDetail | null> {
  const scope = await resolveScope(DEFAULT_FILTERS.stateId);
  const seed = ALERT_SEEDS.find((record) => record.id === id);
  if (!seed) {
    return null;
  }
  let lgaName: string | null = null;
  if (seed.lgaId) {
    const lga = scope.lgas.get(seed.lgaId);
    if (!lga) {
      throw new PublicAlertsServiceError(
        "unauthorized",
        "This alert is outside your authorized jurisdiction.",
      );
    }
    lgaName = lga.name;
  }
  return {
    id: seed.id,
    title: seed.title,
    stateId: seed.stateId,
    stateName: scope.stateName,
    lgaId: seed.lgaId,
    lgaName,
    status: seed.status,
    publishedAt: seed.publishedAt,
    lastUpdated: seed.lastUpdated ?? seed.createdAt,
    level: seed.level,
    body: seed.body,
    channels: seed.channels,
    audience: seed.audience,
    createdAt: seed.createdAt,
  };
}

/**
 * Load a single aggregate public alert by reference. Returns null for an
 * unknown reference so the route can show a not-found state; throws
 * "unauthorized" for an alert outside the officer's authorized jurisdiction
 * (backend remains authoritative for real access).
 *
 * TODO(DEV3): Replace with the real public-alert pipeline keyed by id.
 * TODO(DEV4): This adapter must never signal auth outcomes on its own.
 */
export async function getPublicAlertDetail(
  id: string,
): Promise<PublicAlertDetail | null> {
  await delay(380);
  return loadDetail(id);
}

/**
 * Author a new public alert as a Draft through the service. Publishes
 * absolutely nothing — publication is a separate server-side action. Returns
 * the created aggregate detail so the UI can refresh the list from the same
 * store.
 *
 * TODO(DEV3): Replace with the real public-alert authoring/publishing pipeline.
 * TODO(DEV4): Author the alert with the authenticated officer principal.
 */
export async function createPublicAlert(
  input: CreatePublicAlertInput,
): Promise<PublicAlertDetail> {
  await delay(420);
  const title = input.title.trim();
  if (!title) {
    throw new Error("Alert title must not be empty.");
  }
  const scope = await resolveScope(DEFAULT_FILTERS.stateId);
  const now = new Date().toISOString();
  if (input.lgaId && !scope.lgas.has(input.lgaId)) {
    throw new PublicAlertsServiceError(
      "unauthorized",
      "The selected LGA is outside your authorized jurisdiction.",
    );
  }
  const id = `pa-${Date.now().toString(36)}`;
  const seed: PublicAlertSeed = {
    id,
    title,
    stateId: DEFAULT_FILTERS.stateId,
    lgaId: input.lgaId,
    status: "draft",
    level: input.level,
    body: input.body.trim(),
    channels: input.channels,
    publishedAt: null,
    audience: input.audience.trim(),
    createdAt: now,
    lastUpdated: now,
  };
  ALERT_SEEDS.unshift(seed);
  const detail = await loadDetail(id);
  if (!detail) {
    throw new Error("The alert could not be loaded after creation.");
  }
  return detail;
}