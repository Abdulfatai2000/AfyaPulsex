/**
 * Officer Early Warning Center — aggregate warning service (mock).
 *
 * SECURITY / PRIVACY CONTRACT (DEV4):
 * - This module returns ONLY aggregate, jurisdiction-level warning signals:
 *   warning id, title, aggregate signal wording, state/LGA/ward, a health
 *   condition category, an aggregate time window, status, and severity.
 * - No citizen names, citizen IDs, phone numbers, exact addresses, individual
 *   records, or individual coordinates are ever produced here.
 * - Warnings with insufficient aggregated data are never presented as "0".
 *   They carry `dataSufficiency = "insufficient"` with null estimates/counts
 *   and a human-readable note instead of fabricated numbers.
 *
 * TODO(DEV3): Replace the mock bodies below with the real early-warning
 *   aggregation pipeline. The signatures and types are the contract.
 * TODO(DEV4): Scope by authenticated officer jurisdiction and apply the privacy
 *   threshold before any warning or estimate is returned.
 */

export type WarningStatus =
  "new" | "monitoring" | "requires-review" | "escalated" | "closed";

export type WarningSeverity = "high" | "moderate" | "low";

export type WarningTimeRange = "7d" | "14d" | "30d";

export interface WarningFilters {
  status: WarningStatus | "all";
  state: string;
  lga: string;
  healthCondition: string;
  timeRange: WarningTimeRange;
  severity: WarningSeverity | "all";
  search: string;
}

export interface EarlyWarning {
  id: string;
  title: string;
  /** Aggregate, public-health wording — never a clinical diagnosis. */
  signal: string;
  state: string;
  lga: string;
  ward: string | null;
  healthCondition: string;
  /** Human-readable aggregate time window, e.g. "Sep 16 – Sep 23, 2026". */
  timeWindow: string;
  /** Days the aggregate window covers — drives the time-period filter. */
  windowDays: 7 | 14 | 30;
  status: WarningStatus;
  severity: WarningSeverity;
  /** Estimated % above recent baseline. Null when data is insufficient. */
  elevatedEstimate: number | null;
  /** Aggregate signal count. Null when data is insufficient. */
  signalCount: number | null;
  lastUpdated: string;
  /**
   * TRUE when the bucket falls below the privacy aggregation threshold.
   * Never displayed as a zero count — see the nullable fields above.
   */
  dataSufficiency: "sufficient" | "insufficient";
  note?: string;
}

export interface WarningSummaryCounts {
  active: number;
  requiresReview: number;
  monitoring: number;
  escalated: number;
}

export type WarningDataStatus =
  "loading" | "ready" | "empty" | "insufficient" | "error";

export class WarningsServiceError extends Error {
  constructor(
    public code: "network",
    message?: string,
  ) {
    super(message);
    this.name = "WarningsServiceError";
  }
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const STATUS_LABELS: Record<WarningStatus, string> = {
  new: "New",
  monitoring: "Monitoring",
  "requires-review": "Requires Review",
  escalated: "Escalated",
  closed: "Closed",
};

export const STATUS_OPTIONS: ReadonlyArray<{
  value: WarningStatus;
  label: string;
}> = [
  { value: "new", label: "New" },
  { value: "monitoring", label: "Monitoring" },
  { value: "requires-review", label: "Requires Review" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
];

export const SEVERITY_LABELS: Record<WarningSeverity, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
};

export const SEVERITY_OPTIONS: ReadonlyArray<{
  value: WarningSeverity;
  label: string;
}> = [
  { value: "high", label: "High" },
  { value: "moderate", label: "Moderate" },
  { value: "low", label: "Low" },
];

export const HEALTH_CONDITION_OPTIONS: ReadonlyArray<string> = [
  "Health reporting activity",
  "Fever / malaria-like",
  "Cough / respiratory",
  "Headache",
  "Diarrhoea / gastro",
  "Typhoid-like",
  "Unknown / non-specific",
];

export const TIME_RANGE_OPTIONS: ReadonlyArray<{
  value: WarningTimeRange;
  label: string;
}> = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
];

export const RANGE_DAYS: Record<WarningTimeRange, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
};

export const DEFAULT_FILTERS: WarningFilters = {
  status: "all",
  state: "Osun State",
  lga: "",
  healthCondition: "",
  timeRange: "30d",
  severity: "all",
  search: "",
};

// Aggregate warnings — scoped to the officer's jurisdiction. No citizen data.
const MOCK_WARNINGS: EarlyWarning[] = [
  {
    id: "w-001",
    title: "Fever activity above recent baseline — Ward 4",
    signal:
      "Pattern noticed: aggregate fever activity above the recent 7-day baseline in Ife Central (Ward 4). Escalated to state-level review.",
    state: "Osun State",
    lga: "Ife Central",
    ward: "Ward 4",
    healthCondition: "Fever / malaria-like",
    timeWindow: "Sep 16 – Sep 23, 2026",
    windowDays: 7,
    status: "escalated",
    severity: "high",
    elevatedEstimate: 38,
    signalCount: 42,
    lastUpdated: "2026-09-23T08:15:00Z",
    dataSufficiency: "sufficient",
  },
  {
    id: "w-002",
    title: "Headache pattern noticed — requires review",
    signal:
      "Pattern noticed in repeated headache reports across Ife East. Requires review before a monitoring decision is made.",
    state: "Osun State",
    lga: "Ife East",
    ward: null,
    healthCondition: "Headache",
    timeWindow: "Sep 8 – Sep 22, 2026",
    windowDays: 14,
    status: "requires-review",
    severity: "moderate",
    elevatedEstimate: 16,
    signalCount: 23,
    lastUpdated: "2026-09-22T11:30:00Z",
    dataSufficiency: "sufficient",
  },
  {
    id: "w-003",
    title: "Cough reports increasing — monitoring",
    signal:
      "Activity above recent baseline for cough. Monitoring continues; no escalation required at this time.",
    state: "Osun State",
    lga: "Ife Central",
    ward: "Ward 2",
    healthCondition: "Cough / respiratory",
    timeWindow: "Sep 16 – Sep 23, 2026",
    windowDays: 7,
    status: "monitoring",
    severity: "moderate",
    elevatedEstimate: 12,
    signalCount: 38,
    lastUpdated: "2026-09-23T07:45:00Z",
    dataSufficiency: "sufficient",
  },
  {
    id: "w-004",
    title: "Diarrhoea reports — new pattern",
    signal:
      "New pattern noticed: diarrhoea activity above recent baseline. Awaiting initial triage.",
    state: "Osun State",
    lga: "Ife Central",
    ward: "Ward 2",
    healthCondition: "Diarrhoea / gastro",
    timeWindow: "Sep 17 – Sep 24, 2026",
    windowDays: 7,
    status: "new",
    severity: "low",
    elevatedEstimate: 9,
    signalCount: 14,
    lastUpdated: "2026-09-23T06:20:00Z",
    dataSufficiency: "sufficient",
  },
  {
    id: "w-005",
    title: "Typhoid-like pattern — closed",
    signal: "Pattern reviewed and returned to recent baseline. Warning closed.",
    state: "Osun State",
    lga: "Ife East",
    ward: "Ward 7",
    healthCondition: "Typhoid-like",
    timeWindow: "Aug 25 – Sep 24, 2026",
    windowDays: 30,
    status: "closed",
    severity: "low",
    elevatedEstimate: null,
    signalCount: 18,
    lastUpdated: "2026-09-18T09:00:00Z",
    dataSufficiency: "sufficient",
  },
  {
    id: "w-006",
    title: "Fever reports — insufficient aggregated data",
    signal:
      "Activity above recent baseline for fever. Insufficient aggregated data for a reliable estimate — monitoring continues.",
    state: "Osun State",
    lga: "Ife Central",
    ward: "Ward 6",
    healthCondition: "Fever / malaria-like",
    timeWindow: "Sep 16 – Sep 23, 2026",
    windowDays: 7,
    status: "monitoring",
    severity: "moderate",
    elevatedEstimate: null,
    signalCount: null,
    lastUpdated: "2026-09-23T08:00:00Z",
    dataSufficiency: "insufficient",
    note: "No reliable aggregate estimate is available for this area. Counts are suppressed to protect privacy.",
  },
];

/**
 * Fetch the jurisdiction-wide warning summary counts.
 * TODO(DEV3): Replace with a real aggregation over the current early warnings.
 */
export async function getWarningSummary(): Promise<WarningSummaryCounts> {
  await delay(300);
  return {
    active: MOCK_WARNINGS.filter((w) => w.status !== "closed").length,
    requiresReview: MOCK_WARNINGS.filter((w) => w.status === "requires-review")
      .length,
    monitoring: MOCK_WARNINGS.filter((w) => w.status === "monitoring").length,
    escalated: MOCK_WARNINGS.filter((w) => w.status === "escalated").length,
  };
}

/**
 * Derive the list status from a returned warning list (excluding loading/error,
 * which are driven by the fetch lifecycle).
 */
export function deriveWarningStatus(
  warnings: EarlyWarning[],
): "ready" | "empty" | "insufficient" {
  if (warnings.length === 0) {
    return "empty";
  }
  if (warnings.every((w) => w.dataSufficiency === "insufficient")) {
    return "insufficient";
  }
  return "ready";
}
/** Detail-page load lifecycle for a single warning. */
export type WarningDetailState = "loading" | "ready" | "empty" | "error";

/**
 * Fetch a single aggregate warning by its reference id, or `null` when the id
 * is unknown or outside the officer's jurisdiction.
 *
 * SECURITY / PRIVACY CONTRACT (DEV4): returns the SAME aggregate,
 * jurisdiction-level payload as the list. Citizen names, ids, exact addresses,
 * coordinates, and individual records are never produced here. `null` fields
 * keep meaning "suppressed below the aggregation threshold", never "zero".
 *
 * TODO(DEV3): Replace the mock lookup with the real early-warning pipeline.
 * TODO(DEV4): The unauthorized / forbidden / session-expired UI states are
 *   driven by the server-side session boundary at the route, NOT by this mock
 *   adapter, which must never signal auth outcomes on its own.
 */
export async function getWarningById(id: string): Promise<EarlyWarning | null> {
  await delay(320);
  return MOCK_WARNINGS.find((w) => w.id === id) ?? null;
}

/**
 * Fetch aggregate early warnings for the officer's jurisdiction.
 *
 * Returns: AGGREGATE warnings only. No citizen-level records.
 * The mock narrows the list by status, state/LGA, health condition, severity,
 * time period, and a free-text search over warning wording and areas.
 *
 * TODO(DEV3): Replace with the real early-warning aggregation pipeline.
 * TODO(DEV4): Jurisdiction scoping + privacy threshold must be enforced
 *   server-side, not merely in this mock.
 */
export async function getWarnings(
  filters: WarningFilters,
): Promise<EarlyWarning[]> {
  await delay(420);

  let list = MOCK_WARNINGS.filter(
    (w) => w.windowDays <= RANGE_DAYS[filters.timeRange],
  );

  if (filters.status !== "all") {
    list = list.filter((w) => w.status === filters.status);
  }
  if (filters.state) {
    list = list.filter((w) => w.state === filters.state);
  }
  if (filters.lga) {
    list = list.filter((w) => w.lga === filters.lga);
  }
  if (filters.healthCondition) {
    list = list.filter((w) => w.healthCondition === filters.healthCondition);
  }
  if (filters.severity !== "all") {
    list = list.filter((w) => w.severity === filters.severity);
  }
  const query = filters.search.trim().toLowerCase();
  if (query) {
    list = list.filter(
      (w) =>
        w.title.toLowerCase().includes(query) ||
        w.signal.toLowerCase().includes(query) ||
        w.healthCondition.toLowerCase().includes(query) ||
        (w.ward ?? "").toLowerCase().includes(query) ||
        w.lga.toLowerCase().includes(query),
    );
  }

  return list;
}
