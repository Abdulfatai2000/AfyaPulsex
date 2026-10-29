/**
 * Officer Signal Explorer - aggregate signal-group service (mock).
 *
 * SECURITY / PRIVACY CONTRACT (DEV4):
 * - This module returns ONLY aggregate signal groups for the selected
 *   geography scope, plus jurisdiction-level summary, trend, demographics,
 *   and related-symptom aggregates.
 * - No citizen names, citizen ids, phone numbers, exact addresses, individual
 *   records, or individual coordinates are ever produced here.
 * - A signal group whose aggregate falls below the privacy threshold is never
 *   presented as a zero count. It carries dataSufficiency = "insufficient"
 *   with null counts and a human-readable note instead of fabricated numbers.
 * - Geography is resolved through the geography service (36 states + FCT,
 *   774 LGAs). An LGA whose parent State does not match the selected State
 *   throws "unauthorized" here, and the backend/auth layer remains the
 *   authoritative jurisdiction boundary for what the officer may access.
 *
 * The Explorer reuses the Signal Map's filter model (MapFilters), so both
 * features share one filter contract, geography flow, and backend data shape.
 *
 * TODO(DEV3): Replace the mock bodies below with the real aggregate explorer
 *   pipeline. The signatures and types are the contract.
 * TODO(DEV4): Scope by authenticated officer jurisdiction and apply the privacy
 *   threshold BEFORE any group is returned.
 */

import { geographyService } from "./geography";
import type { MapFilters, Severity, TimeRange } from "./map";
import {
  AGE_GROUP_OPTIONS,
  AGE_GROUP_LABELS,
  DEFAULT_FILTERS as DEFAULT_MAP_FILTERS,
  SEX_LABELS,
  SYMPTOM_OPTIONS,
} from "./map";
import { HEALTH_CONDITION_OPTIONS } from "./warnings";

/** Optional "compare with" baseline for the selected window. */
export type CompareWith = "none" | "previous-period" | "same-period-last-year";

/**
 * The Explorer shares the Signal Map's filter model (MapFilters) plus an
 * Explorer-only comparison baseline. The map's model is left untouched so the
 * two surfaces keep one shared filter contract.
 */
export type ExplorerFilters = MapFilters & { compareWith: CompareWith };

export const COMPARE_WITH_OPTIONS: ReadonlyArray<{
  value: CompareWith;
  label: string;
}> = [
  { value: "none", label: "None" },
  { value: "previous-period", label: "Previous period" },
  { value: "same-period-last-year", label: "Same period last year" },
];

/** Default explorer scope mirrors the Signal Map's initial jurisdiction. */
export const DEFAULT_FILTERS: ExplorerFilters = {
  ...DEFAULT_MAP_FILTERS,
  compareWith: "none",
};

/** Deterministic age-group weights used to re-scale aggregates per filter. */
export const AGE_WEIGHTS: Record<string, number> = {
  "0-14": 0.24,
  "15-29": 0.3,
  "30-44": 0.24,
  "45-59": 0.14,
  "60+": 0.08,
};

/** Deterministic sex weights used to re-scale aggregates per filter. */
export const SEX_WEIGHTS: Record<string, number> = {
  male: 0.52,
  female: 0.47,
  other: 0.01,
};

export const RANGE_DAYS: Record<TimeRange, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
};

export type ExplorerActivityStatus =
  | "elevated"
  | "pattern-noticed"
  | "requires-review"
  | "monitoring"
  | "returned-to-baseline";

export const ACTIVITY_LABELS: Record<ExplorerActivityStatus, string> = {
  elevated: "Elevated activity",
  "pattern-noticed": "Pattern noticed",
  "requires-review": "Requires review",
  monitoring: "Monitoring",
  "returned-to-baseline": "Returned to baseline",
};

/** Activity status -> severity pairing for badges and severity filters. */
const ACTIVITY_SEVERITY: Record<ExplorerActivityStatus, Severity> = {
  elevated: "high",
  "pattern-noticed": "high",
  "requires-review": "moderate",
  monitoring: "moderate",
  "returned-to-baseline": "low",
};

export interface ExplorerSignalGroup {
  groupId: string;
  /** Surveillable unit, e.g. "Ife Central Ward 2". */
  name: string;
  /** Parent area label, e.g. "Ife Central" or "Osun State". */
  area: string;
  locationType: "ward" | "area";
  activityStatus: ExplorerActivityStatus;
  severity: Severity;
  /** Aggregate signal count for the selected window. Null when suppressed. */
  signalCount: number | null;
  /** Aggregate report-type split. Null when suppressed. */
  reportTypes: { case: number; outbreak: number; surveillance: number } | null;
  primarySymptom: string | null;
  healthCondition: string | null;
  dataSufficiency: "sufficient" | "insufficient";
  note?: string;
}

export interface ExplorerTrendPoint {
  label: string;
  /** Aggregate count for the period. Null when suppressed. */
  count: number | null;
  /** True when the period is above the jurisdiction baseline. */
  elevated: boolean;
}

export interface ExplorerDemographicBucket {
  label: string;
  /** Aggregate count. Null when suppressed below the threshold. */
  count: number | null;
}

export interface ExplorerDemographics {
  ageGroups: ExplorerDemographicBucket[];
  sexes: ExplorerDemographicBucket[];
}

export interface ExplorerRelatedSymptom {
  symptom: string;
  /** Aggregate signal count. Null when suppressed below the threshold. */
  count: number | null;
}

export interface ExplorerSummaryCounts {
  /** Number of surveillable groups in scope (suppressed groups included). */
  signalGroups: number;
  /** Total aggregated signals across sufficient groups. */
  aggregateSignals: number;
  /** Groups with elevated activity or a noticed pattern. */
  elevated: number;
  /** Groups awaiting review. */
  requiresReview: number;
  /** Comparison vs a prior baseline, when "compare with" is set. */
  comparison?: {
    label: string;
    /** Prior-window aggregate. Null when below the privacy threshold. */
    previousAggregate: number | null;
    /** Change vs the baseline. Null when the baseline is suppressed. */
    changePct: number | null;
  };
}

export interface ExplorerScope {
  stateId: string;
  stateName: string;
  lgaId: string;
  lgaName: string | null;
  /** Display label for the current selection. */
  areaLabel: string;
}

export interface ExplorerData {
  groups: ExplorerSignalGroup[];
  summary: ExplorerSummaryCounts;
  trend: ExplorerTrendPoint[];
  demographics: ExplorerDemographics | null;
  relatedSymptoms: ExplorerRelatedSymptom[];
  scope: ExplorerScope;
  generatedAt: string;
}

export type ExplorerDataStatus =
  | "loading"
  | "ready"
  | "empty"
  | "insufficient"
  | "unauthorized"
  | "error";

export class ExplorerServiceError extends Error {
  constructor(
    public code: "unauthorized" | "network",
    message?: string,
  ) {
    super(message);
    this.name = "ExplorerServiceError";
  }
}

// Re-export the filter option surfaces so the Explorer UI imports everything
// from one module (the values live with the shared Signal Map filter model).
export {
  AGE_GROUP_LABELS,
  AGE_GROUP_OPTIONS,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_OPTIONS,
  SEVERITY_LABELS,
  SEVERITY_OPTIONS,
  SEX_LABELS,
  SEX_OPTIONS,
  SYMPTOM_OPTIONS,
  TIME_RANGE_OPTIONS,
} from "./map";
export { HEALTH_CONDITION_OPTIONS } from "./warnings";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const PRIVACY_THRESHOLD = 4;

const SEVERITY_ORDER: Severity[] = ["low", "moderate", "high"];

/** Share of the aggregate attributed to each reporting channel. */
const REPORT_CHANNEL_SHARES: Record<string, number> = {
  case: 0.62,
  outbreak: 0.14,
  surveillance: 0.24,
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

function pickStatus(key: string): ExplorerActivityStatus {
  const r = stableHash(key);
  if (r < 0.14) return "returned-to-baseline";
  if (r < 0.34) return "monitoring";
  if (r < 0.54) return "requires-review";
  if (r < 0.8) return "pattern-noticed";
  return "elevated";
}

interface RawGroup {
  key: string;
  name: string;
  area: string;
  locationType: "ward" | "area";
  index: number;
  baseCount: number;
  status: ExplorerActivityStatus;
  primarySymptom: string;
  healthCondition: string;
}

function buildRawGroup(
  scopeKey: string,
  name: string,
  area: string,
  locationType: "ward" | "area",
  index: number,
): RawGroup {
  const key = `${scopeKey}::${name}`;
  return {
    key,
    name,
    area,
    locationType,
    index,
    baseCount: 20 + Math.round(stableHash(key) * 40),
    status: pickStatus(`${key}::status`),
    primarySymptom: SYMPTOM_OPTIONS[index % SYMPTOM_OPTIONS.length],
    healthCondition:
      HEALTH_CONDITION_OPTIONS[index % HEALTH_CONDITION_OPTIONS.length],
  };
}

function suppressedGroup(g: RawGroup): ExplorerSignalGroup {
  return {
    groupId: g.key,
    name: g.name,
    area: g.area,
    locationType: g.locationType,
    activityStatus: g.status,
    severity: ACTIVITY_SEVERITY[g.status],
    signalCount: null,
    reportTypes: null,
    primarySymptom: g.primarySymptom,
    healthCondition: g.healthCondition,
    dataSufficiency: "insufficient",
    note: "Aggregates for this area are below the privacy threshold and are suppressed.",
  };
}

function sufficientGroup(g: RawGroup, count: number): ExplorerSignalGroup {
  const caseShare = 0.56 + stableHash(`${g.key}::case`) * 0.16;
  const survShare = 0.2 + stableHash(`${g.key}::surv`) * 0.12;
  let caseCount = Math.round(count * caseShare);
  const surveillanceCount = Math.round(count * survShare);
  const outbreakCount = Math.max(0, count - caseCount - surveillanceCount);
  caseCount += count - (caseCount + surveillanceCount + outbreakCount);
  return {
    groupId: g.key,
    name: g.name,
    area: g.area,
    locationType: g.locationType,
    activityStatus: g.status,
    severity: ACTIVITY_SEVERITY[g.status],
    signalCount: count,
    reportTypes: {
      case: caseCount,
      outbreak: outbreakCount,
      surveillance: surveillanceCount,
    },
    primarySymptom: g.primarySymptom,
    healthCondition: g.healthCondition,
    dataSufficiency: "sufficient",
  };
}

/**
 * Narrowes the raw scope to the selected filters. Re-scaling below the
 * privacy threshold re-suppresses the group so partial selections never leak
 * sparse aggregates. Symptom/condition are case-insensitive substrings on the
 * group's aggregate category labels (never on individual records).
 */
function applyScopeFilters(
  raw: RawGroup[],
  filters: ExplorerFilters,
): ExplorerSignalGroup[] {
  const rangeScale = RANGE_DAYS[filters.timeRange] / 7;
  const ageWeight =
    filters.ageGroup === "all" ? 1 : AGE_WEIGHTS[filters.ageGroup];
  const sexWeight = filters.sex === "all" ? 1 : SEX_WEIGHTS[filters.sex];
  const channelWeight =
    filters.reportType === "all"
      ? 1
      : REPORT_CHANNEL_SHARES[filters.reportType];

  const symptomNeedle = filters.symptom.trim().toLowerCase();
  const conditionNeedle = filters.healthCondition.trim().toLowerCase();
  const minSeverity =
    filters.severity === "all" ? 0 : SEVERITY_ORDER.indexOf(filters.severity);

  const groups: ExplorerSignalGroup[] = [];

  for (const g of raw) {
    if (symptomNeedle && !g.primarySymptom.toLowerCase().includes(symptomNeedle)) {
      continue;
    }
    if (conditionNeedle && !g.healthCondition.toLowerCase().includes(conditionNeedle)) {
      continue;
    }

    const severity = ACTIVITY_SEVERITY[g.status];
    if (filters.severity !== "all" && SEVERITY_ORDER.indexOf(severity) < minSeverity) {
      continue;
    }

    const count = Math.max(
      0,
      Math.round(g.baseCount * rangeScale * ageWeight * sexWeight * channelWeight),
    );

    // Deterministic subset of dev groups is below the threshold so the mock
    // exercises the privacy-suppression path; real data (DEV3) will compute
    // this strictly from the aggregate size.
    const forceSuppressed = g.index % 3 === 1;

    groups.push(
      forceSuppressed || count < PRIVACY_THRESHOLD
        ? suppressedGroup(g)
        : sufficientGroup(g, count),
    );
  }

  return groups;
}

function buildTrend(
  scopeKey: string,
  range: TimeRange,
  totalSignals: number,
): ExplorerTrendPoint[] {
  const days = RANGE_DAYS[range];
  const buckets = range === "30d" ? 10 : 7;
  const bucketWidth = days / buckets;
  const perBucket = totalSignals === 0 ? 0 : Math.max(1, Math.round(totalSignals / buckets));
  const points: ExplorerTrendPoint[] = [];
  const today = new Date();

  for (let b = 0; b < buckets; b++) {
    const endDay = new Date(today);
    endDay.setDate(today.getDate() - Math.round(days - (b + 1) * bucketWidth));
    const label = new Intl.DateTimeFormat("en-NG", {
      month: "short",
      day: "numeric",
    }).format(endDay);
    const seed = stableHash(`${scopeKey}::trend::${b}`);
    const rawCount =
      perBucket === 0 ? 0 : Math.max(0, Math.round(perBucket * (0.5 + seed)));
    points.push({
      label,
      count: rawCount < PRIVACY_THRESHOLD ? null : rawCount,
      elevated: seed > 0.62 && rawCount >= PRIVACY_THRESHOLD,
    });
  }

  return points;
}

function buildDemographics(
  groups: ExplorerSignalGroup[],
): ExplorerDemographics | null {
  const sufficient = groups.filter((g) => g.dataSufficiency === "sufficient");
  if (sufficient.length === 0) {
    return null;
  }

  const ageGroups = AGE_GROUP_OPTIONS.filter((a) => a !== "all").map((age) => {
    const total = sufficient.reduce(
      (sum, g) => sum + Math.round((g.signalCount ?? 0) * AGE_WEIGHTS[age]),
      0,
    );
    return {
      label: AGE_GROUP_LABELS[age],
      count: total < PRIVACY_THRESHOLD ? null : total,
    };
  });

  const sexes = ["male", "female", "other"].map((sex) => {
    const total = sufficient.reduce(
      (sum, g) => sum + Math.round((g.signalCount ?? 0) * SEX_WEIGHTS[sex]),
      0,
    );
    return {
      label: SEX_LABELS[sex],
      count: total < PRIVACY_THRESHOLD ? null : total,
    };
  });

  return { ageGroups, sexes };
}

function buildRelatedSymptoms(
  groups: ExplorerSignalGroup[],
): ExplorerRelatedSymptom[] {
  const totals = new Map<string, number>();
  for (const g of groups) {
    if (g.dataSufficiency !== "sufficient" || !g.primarySymptom) {
      continue;
    }
    const next = (totals.get(g.primarySymptom) ?? 0) + (g.signalCount ?? 0);
    totals.set(g.primarySymptom, next);
  }

  return [...totals.entries()]
    .map(([symptom, count]) => ({
      symptom,
      count: count < PRIVACY_THRESHOLD ? null : count,
    }))
    .filter((s) => s.count !== null)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 5);
}

/**
 * Build a jurisdiction-level baseline comparison for the selected "compare
 * with" option. Comparisons are deterministic aggregate deltas (never
 * individual records); a baseline below the privacy threshold is suppressed
 * rather than reported as a zero.
 */
function buildComparison(
  compareWith: CompareWith,
  scopeKey: string,
  currentAggregate: number,
): NonNullable<ExplorerSummaryCounts["comparison"]> | null {
  if (compareWith === "none" || currentAggregate < PRIVACY_THRESHOLD) {
    return null;
  }
  const label =
    COMPARE_WITH_OPTIONS.find((o) => o.value === compareWith)?.label ?? "";
  const seed = stableHash(`${scopeKey}::compare::${compareWith}`);
  const previous = Math.round(currentAggregate * (0.72 + seed * 0.56));
  const previousAggregate = previous < PRIVACY_THRESHOLD ? null : previous;
  const changePct =
    previousAggregate === null
      ? null
      : Math.round(((currentAggregate - previousAggregate) / previousAggregate) * 100);
  return { label, previousAggregate, changePct };
}

/**
 * Derive the page status from a returned group list (excluding loading/error,
 * which are driven by the fetch lifecycle).
 */
export function deriveExplorerStatus(
  groups: ExplorerSignalGroup[],
): "ready" | "empty" | "insufficient" {
  if (groups.length === 0) {
    return "empty";
  }
  if (groups.every((g) => g.dataSufficiency === "insufficient")) {
    return "insufficient";
  }
  return "ready";
}

/**
 * Fetch aggregate signal groups for the selected geographic scope.
 *
 * Returns: AGGREGATE signal groups plus jurisdiction-level summary, trend,
 *   demographics, and related-symptom aggregates. No individual records.
 * Throws: ExplorerServiceError("unauthorized") for an unknown State or an LGA
 *   whose parent State does not match the selected State.
 *
 * The dev mock serves any structurally-valid State/LGA scope. An LGA scope is
 * broken into wards; a State scope into aggregate district-level areas derived
 * from the state's LGAs. The backend (DEV3/DEV4) will additionally scope by
 * the authenticated officer's jurisdiction and enforce the privacy threshold
 * server-side.
 */
export async function getExplorerData(
  filters: ExplorerFilters,
): Promise<ExplorerData> {
  await delay(420);

  const state = filters.stateId
    ? await geographyService.getStateById(filters.stateId)
    : null;
  if (!state) {
    throw new ExplorerServiceError(
      "unauthorized",
      "Access to the selected State is restricted.",
    );
  }

  let scope: ExplorerScope;
  let raw: RawGroup[];

  if (filters.lgaId) {
    const lga = await geographyService.getLgaById(filters.lgaId);
    if (!lga || lga.stateId !== state.id) {
      // Structural guarantee: an LGA can never be served under the wrong
      // State. Impossible pairings (e.g. Ogun State + Ife Central) throw even
      // when a client crafts the request directly.
      throw new ExplorerServiceError(
        "unauthorized",
        "The selected LGA does not belong to the selected State.",
      );
    }
    scope = {
      stateId: state.id,
      stateName: state.name,
      lgaId: lga.id,
      lgaName: lga.name,
      areaLabel: lga.name,
    };
    const scopeKey = `${state.id}::${lga.id}::${filters.timeRange}`;
    raw = [1, 2, 3, 4, 5, 6].map((ward, index) =>
      buildRawGroup(scopeKey, `${lga.name} Ward ${ward}`, lga.name, "ward", index),
    );
  } else {
    // State-only selection = aggregate district-level areas for the State.
    scope = {
      stateId: state.id,
      stateName: state.name,
      lgaId: "",
      lgaName: null,
      areaLabel: `${state.name} (entire state)`,
    };
    const lgas = await geographyService.getLgasByState(state.id);
    const step = Math.max(1, Math.ceil(lgas.length / 6));
    const picked = lgas.filter((_, index) => index % step === 0).slice(0, 6);
    const scopeKey = `${state.id}::state::${filters.timeRange}`;
    raw = picked.map((lga, index) =>
      buildRawGroup(scopeKey, `${lga.name} area`, state.name, "area", index),
    );
  }

  const groups = applyScopeFilters(raw, filters);

  const sufficient = groups.filter((g) => g.dataSufficiency === "sufficient");
  const aggregateSignals = sufficient.reduce(
    (sum, g) => sum + (g.signalCount ?? 0),
    0,
  );

  const scopeKey =
    raw.length > 0
      ? raw[0].key.split("::").slice(0, 3).join("::")
      : `${state.id}::unknown::${filters.timeRange}`;

  const comparison = buildComparison(
    filters.compareWith,
    scopeKey,
    aggregateSignals,
  );

  const summary: ExplorerSummaryCounts = {
    signalGroups: groups.length,
    aggregateSignals,
    elevated: groups.filter(
      (g) =>
        g.activityStatus === "elevated" ||
        g.activityStatus === "pattern-noticed",
    ).length,
    requiresReview: groups.filter(
      (g) => g.activityStatus === "requires-review",
    ).length,
  };
  if (comparison) {
    summary.comparison = comparison;
  }

  return {
    groups,
    summary,
    trend: buildTrend(scopeKey, filters.timeRange, aggregateSignals),
    demographics: buildDemographics(groups),
    relatedSymptoms: buildRelatedSymptoms(groups),
    scope,
    generatedAt: new Date().toISOString(),
  };
}