/**
 * Officer Live Signal Map - aggregate zone service (mock).
 *
 * SECURITY / PRIVACY CONTRACT (DEV4):
 * - This module returns ONLY aggregate zone buckets (zoneId, name, centroid,
 *   radius, activityLevel, reportCount, topSymptom).
 * - No citizen names, exact addresses, phone numbers, or raw per-citizen
 *   coordinates are ever produced here.
 * - Geography is resolved through the geography service (reference hierarchy,
 *   36 states + FCT, 774 LGAs). An LGA whose parent State does not match the
 *   selected State (e.g. Ogun State + Ife Central) throws "unauthorized" here,
 *   and the backend/auth layer remains the authoritative jurisdiction boundary
 *   for what the officer may actually access.
 *
 * TODO(DEV3): Replace the mock body of getMapData with the real MongoDB
 *   aggregation pipeline. The signatures and types below are the contract.
 * TODO(DEV4): Scope by authenticated officer jurisdiction server-side and apply
 *   the privacy threshold BEFORE returning any bucket.
 */

import { geographyService } from "./geography";

export type ActivityLevel = "high" | "moderate" | "low" | "none";

export type TimeRange = "7d" | "14d" | "30d";

export type Severity = "all" | "high" | "moderate" | "low";

export type ReportType = "all" | "case" | "outbreak" | "surveillance";

export type Sex = "all" | "male" | "female" | "other";

export type AgeGroup = "all" | "0-14" | "15-29" | "30-44" | "45-59" | "60+";

export interface MapFilters {
  /** Geography service State id (slug), e.g. "oyo". */
  stateId: string;
  /** Geography service LGA id (slug), e.g. "ibadan-north" ("" = whole state). */
  lgaId: string;
  symptom: string;
  healthCondition: string;
  ageGroup: AgeGroup;
  sex: Sex;
  timeRange: TimeRange;
  severity: Severity;
  reportType: ReportType;
}

export interface MapZone {
  /** Explicit provenance for synthetic Demo Mode examples only. */
  source?: "demo";
  zoneId: string;
  name: string;
  /** Centroid of an aggregate zone bucket - never individual coordinates. */
  lat: number;
  lng: number;
  /** Radius (km) of the aggregate zone bucket. */
  radius: number;
  activityLevel: ActivityLevel;
  reportCount: number;
  topSymptom: string | null;
  /** True when the bucket falls below the privacy aggregation threshold. */
  suppressed: boolean;
}

export type MapDataStatus =
  | "loading"
  | "ready"
  | "empty"
  | "privacy"
  | "unauthorized"
  | "error";

export class MapServiceError extends Error {
  constructor(
    public code: "unauthorized" | "network",
    message?: string,
  ) {
    super(message);
    this.name = "MapServiceError";
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const SYMPTOM_OPTIONS: ReadonlyArray<string> = [
  "Fever",
  "Cough",
  "Headache",
  "Diarrhea",
  "Malaria-like",
  "Typhoid",
];

export const AGE_GROUP_OPTIONS: AgeGroup[] = [
  "all",
  "0-14",
  "15-29",
  "30-44",
  "45-59",
  "60+",
];

export const SEX_OPTIONS: Sex[] = ["all", "male", "female", "other"];

export const SEVERITY_OPTIONS: Severity[] = ["all", "high", "moderate", "low"];

export const REPORT_TYPE_OPTIONS: ReportType[] = [
  "all",
  "case",
  "outbreak",
  "surveillance",
];

export const TIME_RANGE_OPTIONS: ReadonlyArray<{
  value: TimeRange;
  label: string;
}> = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
];

export const AGE_GROUP_LABELS: Record<string, string> = {
  all: "All",
  "0-14": "0-14",
  "15-29": "15-29",
  "30-44": "30-44",
  "45-59": "45-59",
  "60+": "60+",
};

export const SEX_LABELS: Record<string, string> = {
  all: "All",
  male: "Male",
  female: "Female",
  other: "Other",
};

export const SEVERITY_LABELS: Record<string, string> = {
  all: "All",
  high: "High",
  moderate: "Moderate",
  low: "Low",
};

export const REPORT_TYPE_LABELS: Record<string, string> = {
  all: "All",
  case: "Case",
  outbreak: "Outbreak",
  surveillance: "Surveillance",
};

export const DEFAULT_FILTERS: MapFilters = {
  stateId: "",
  lgaId: "",
  symptom: "",
  healthCondition: "",
  ageGroup: "all",
  sex: "all",
  timeRange: "7d",
  severity: "all",
  reportType: "all",
};

/** Deterministic [0,1) hash so dev aggregate buckets are scope-stable. */
function stableHash(input: string): number {
  let hash = 2166136261; // FNV-1a 32-bit seed
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

interface GeographyScope {
  stateName: string;
  stateLat: number;
  stateLng: number;
  lgaName: string | null;
  lgaLat: number;
  lgaLng: number;
}

const PRIVACY_THRESHOLD = 4;

function buildScopeZones(
  scope: GeographyScope,
  filters: MapFilters,
): MapZone[] {
  const scopeKey = `${filters.stateId}::${filters.lgaId}::${filters.timeRange}`;
  const seed = stableHash(scopeKey);
  const label = scope.lgaName ?? scope.stateName;
  const cx = scope.lgaLat ?? scope.stateLat;
  const cy = scope.lgaLng ?? scope.stateLng;

  const template: ReadonlyArray<{
    name: string;
    level: ActivityLevel;
    count: number;
    symptom: string | null;
  }> = [
    { name: `${label} - Ward 1`, level: "high", count: 30 + Math.round(seed * 25), symptom: SYMPTOM_OPTIONS[0] },
    { name: `${label} - Ward 2`, level: "moderate", count: 12 + Math.round(seed * 14), symptom: SYMPTOM_OPTIONS[1] },
    { name: `${label} - Ward 3`, level: "low", count: 4 + Math.round(seed * 8), symptom: SYMPTOM_OPTIONS[2] },
    { name: `${label} - Ward 4`, level: "none", count: 0, symptom: null },
  ];

  return template.map((t, i) => {
    const j1 = stableHash(`${scopeKey}::${t.name}`);
    const j2 = stableHash(`${scopeKey}::${t.name}::jitter`);
    return {
      zoneId: `${filters.stateId}${filters.lgaId ? `-${filters.lgaId}` : ""}-z${i + 1}`,
      name: t.name,
      lat: +(cx + (j1 * 0.12 - 0.06)).toFixed(4),
      lng: +(cy + (j2 * 0.12 - 0.06)).toFixed(4),
      radius: +(0.9 + j1 * 1.4).toFixed(2),
      activityLevel: t.level,
      reportCount: t.count,
      topSymptom: t.symptom,
      suppressed: t.count < PRIVACY_THRESHOLD,
    };
  });
}

function buildOutbreakScopeZone(
  scope: GeographyScope,
  filters: MapFilters,
): MapZone {
  const label = scope.lgaName ?? scope.stateName;
  const cx = scope.lgaLat ?? scope.stateLat;
  const cy = scope.lgaLng ?? scope.stateLng;
  const scopeKey = `${filters.stateId}::${filters.lgaId || "state"}`;
  const j1 = stableHash(scopeKey);
  const j2 = stableHash(`${scopeKey}::jitter`);
  return {
    zoneId: `${filters.stateId}-${filters.lgaId || "state"}-outbreak-suppressed`,
    name: `${label} (outbreak - suppressed)`,
    lat: +(cx + (j1 * 0.08 - 0.04)).toFixed(4),
    lng: +(cy + (j2 * 0.08 - 0.04)).toFixed(4),
    radius: 2.4,
    activityLevel: "none",
    reportCount: 0,
    topSymptom: null,
    suppressed: true,
  };
}

/**
 * Derive the page status from a returned zone list (excluding loading/error
 * states, which are driven by the fetch lifecycle).
 */
export function deriveMapStatus(zones: MapZone[]): "ready" | "empty" | "privacy" {
  if (zones.length === 0) {
    return "empty";
  }
  if (zones.every((z) => z.suppressed)) {
    return "privacy";
  }
  return "ready";
}

/**
 * Fetch aggregate zone buckets for the selected geographic scope.
 *
 * Returns: AGGREGATE zone buckets only. No individual coordinates or citizen
 *   data.
 * Throws: MapServiceError("unauthorized") for an unknown State or an LGA whose
 *   parent State does not match the selected State.
 *
 * The dev mock serves any structurally-valid State/LGA scope and narrows
 * buckets by symptom (substring, case-insensitive) and severity (minimum
 * level). Selecting the "outbreak" report type returns a suppressed scope-wide
 * bucket. The backend (DEV3/DEV4) will additionally scope by the authenticated
 * officer's jurisdiction and enforce the privacy threshold server-side.
 */
export async function getMapData(filters: MapFilters): Promise<MapZone[]> {
  await delay(420);

  const state = filters.stateId
    ? await geographyService.getStateById(filters.stateId)
    : null;
  if (!state) {
    throw new MapServiceError(
      "unauthorized",
      "Access to the selected State is restricted.",
    );
  }

  let scope: GeographyScope;
  if (filters.lgaId) {
    const lga = await geographyService.getLgaById(filters.lgaId);
    if (!lga || lga.stateId !== state.id) {
      // Structural guarantee: an LGA can never be served under the wrong
      // State. This makes impossible pairings (e.g. Ogun State + Ife Central)
      // throw even when a client crafts the request directly.
      throw new MapServiceError(
        "unauthorized",
        "The selected LGA does not belong to the selected State.",
      );
    }
    scope = {
      stateName: state.name,
      stateLat: state.lat,
      stateLng: state.lng,
      lgaName: lga.name,
      lgaLat: lga.lat,
      lgaLng: lga.lng,
    };
  } else {
    // State-only selection = aggregate for the entire State.
    scope = {
      stateName: state.name,
      stateLat: state.lat,
      stateLng: state.lng,
      lgaName: null,
      lgaLat: state.lat,
      lgaLng: state.lng,
    };
  }

  if (filters.reportType === "outbreak") {
    return [buildOutbreakScopeZone(scope, filters)];
  }

  let zones = buildScopeZones(scope, filters);

  // Symptom narrowing (case-insensitive substring on the bucket's top symptom).
  if (filters.symptom) {
    const needle = filters.symptom.toLowerCase();
    zones = zones.filter(
      (z) => z.topSymptom !== null && z.topSymptom.toLowerCase().includes(needle),
    );
  }

  // Severity = minimum activity level shown.
  if (filters.severity !== "all") {
    const levelOrder: ActivityLevel[] = ["none", "low", "moderate", "high"];
    const idx = levelOrder.indexOf(filters.severity as ActivityLevel);
    const wanted = new Set(levelOrder.slice(idx));
    zones = zones.filter((z) => wanted.has(z.activityLevel));
  }

  return zones;
}
