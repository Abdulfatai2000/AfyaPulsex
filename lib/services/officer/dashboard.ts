const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// --- Types ---

/** Overview timeframe selection — "7d" | "14d" | "30d". */
export type Timeframe = "7d" | "14d" | "30d";

/**
 * A dashboard metric. `null` means the aggregate fell below the privacy
 * threshold and is suppressed — it must be shown as "Insufficient aggregated
 * data", never as 0 or a blank.
 */
export type DashboardMetricValue = number | null;

export const OFFICER_DASHBOARD_TIMEFRAMES: readonly Timeframe[] = ["7d", "14d", "30d"];

export function isValidDashboardTimeframe(
  value: string | undefined | null,
): value is Timeframe {
  return typeof value === "string" && (OFFICER_DASHBOARD_TIMEFRAMES as readonly string[]).includes(value);
}

export const TIMEFRAME_LABELS: Readonly<Record<Timeframe, string>> = {
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
};

export interface DashboardMetrics {
  activeSignals: DashboardMetricValue;
  activeSignalsChange: DashboardMetricValue; // percent, negative = down
  requiresReview: DashboardMetricValue;
  requiresReviewChange: DashboardMetricValue;
  newReports: DashboardMetricValue;
  newReportsChange: DashboardMetricValue;
  peopleReached: DashboardMetricValue; // approximate aggregate
  peopleReachedChange: DashboardMetricValue;
}

export interface MapPreviewSummary {
  highCount: number;
  moderateCount: number;
  lowCount: number;
  lastUpdated: string;
  jurisdiction: string;
}

export interface SymptomSummary {
  rank: number;
  name: string;
  count: number;
  severity: "high" | "moderate" | "low";
}

export interface AlertSummary {
  id: string;
  title: string;
  description: string;
  urgency: "urgent" | "warning" | "info";
  timestamp: string;
  href: string;
}

export interface WhatChangedToday {
  summary: string;
  aiCaption: string | null; // null if AI not available
  detailHref: string;
}

// --- Service functions ---

/**
 * Fetch aggregated dashboard metrics for the given timeframe.
 *
 * Counts are privacy-safe aggregates only. A `null` value means the aggregate
 * fell below the privacy threshold and is suppressed — render "Insufficient
 * aggregated data", never 0 or a blank.
 *
 * TODO(DEV3): Replace mock with real MongoDB aggregation endpoint.
 * TODO(DEV4): Enforce jurisdiction and privacy threshold before returning counts.
 * @param timeframe - e.g. "7d", "14d", "30d"
 */
export async function getDashboardMetrics(timeframe: Timeframe): Promise<DashboardMetrics> {
  await delay(300);
  return MOCK_METRICS[timeframe];
}

// Aggregate mock counts per timeframe. Numbers grow with the window, mirroring a
// real aggregation that widens the observed period. The mock intentionally never
// returns suppressed (null) counts so the populated state is the default; the
// UI contract still supports null when the real endpoint applies the threshold.
const MOCK_METRICS: Record<Timeframe, DashboardMetrics> = {
  "7d": {
    activeSignals: 12,
    activeSignalsChange: -20,
    requiresReview: 4,
    requiresReviewChange: 33,
    newReports: 126,
    newReportsChange: 15,
    peopleReached: 1250,
    peopleReachedChange: 0,
  },
  "14d": {
    activeSignals: 18,
    activeSignalsChange: -12,
    requiresReview: 6,
    requiresReviewChange: 20,
    newReports: 244,
    newReportsChange: 14,
    peopleReached: 2310,
    peopleReachedChange: 0,
  },
  "30d": {
    activeSignals: 26,
    activeSignalsChange: -9,
    requiresReview: 9,
    requiresReviewChange: 11,
    newReports: 502,
    newReportsChange: 11,
    peopleReached: 4680,
    peopleReachedChange: 0,
  },
};

/**
 * Fetch a privacy-safe geographic summary for the map preview widget.
 * TODO(DEV3): Replace with real geographic aggregate buckets.
 * TODO(DEV4): Jurisdiction boundary enforced server-side; never return raw coordinates.
 */
export async function getMapPreviewSummary(): Promise<MapPreviewSummary> {
  await delay(300);
  return {
    highCount: 3,
    moderateCount: 5,
    lowCount: 2,
    lastUpdated: "2026-09-16T08:00:00Z",
    jurisdiction: "Ife Central LGA",
  };
}

/**
 * Fetch top reported symptoms aggregated over the given timeframe.
 * TODO(DEV3): Replace with real symptom aggregation pipeline.
 * TODO(DEV4): Suppress any symptom group below privacy threshold.
 * @param timeframe - e.g. "7d"
 */
export async function getTopSymptoms(timeframe: Timeframe): Promise<SymptomSummary[]> {
  void timeframe;
  await delay(300);
  return [
    { rank: 1, name: "Fever", count: 42, severity: "high" },
    { rank: 2, name: "Cough", count: 38, severity: "moderate" },
    { rank: 3, name: "Headache", count: 31, severity: "moderate" },
    { rank: 4, name: "Malaria-like", count: 28, severity: "high" },
    { rank: 5, name: "Diarrhea", count: 18, severity: "low" },
  ];
}

/**
 * Fetch the most recent officer-facing alerts for this jurisdiction.
 * TODO(DEV3): Replace with real notifications/warnings query.
 * TODO(DEV4): Filter by officer's authorized jurisdiction and role.
 */
export async function getRecentAlerts(): Promise<AlertSummary[]> {
  await delay(300);
  return [
    {
      id: "a1",
      title: "Fever spike in Ward 4",
      description: "Aggregate fever reports above baseline in Ward 4.",
      urgency: "urgent",
      timestamp: "2026-09-16T07:00:00Z",
      href: "/officer/warnings/w-001",
    },
    {
      id: "a2",
      title: "Diabetes + Headache pattern",
      description: "Pattern noticed — requires review.",
      urgency: "warning",
      timestamp: "2026-09-16T04:00:00Z",
      href: "/officer/warnings/w-002",
    },
    {
      id: "a3",
      title: "LGA Officer access request",
      description: "A new access request is awaiting your approval.",
      urgency: "info",
      timestamp: "2026-09-15T23:00:00Z",
      href: "/officer/approvals",
    },
    {
      id: "a4",
      title: "Cough reports increasing",
      description: "Monitoring — activity above recent baseline.",
      urgency: "info",
      timestamp: "2026-09-15T22:00:00Z",
      href: "/officer/warnings/w-003",
    },
  ];
}

/**
 * Fetch today's change summary for the jurisdiction.
 * TODO(DEV3): Replace with deterministic daily-diff aggregation.
 * TODO(DEV4): AI caption is optional — only included when Groq endpoint is available.
 */
export async function getWhatChangedToday(): Promise<WhatChangedToday> {
  await delay(300);
  return {
    summary:
      "Fever reports increased by 38% compared to the previous 7 days, mainly in Ife Central and surrounding areas.",
    aiCaption:
      "Pattern consistent with seasonal respiratory activity. No confirmed diagnosis — monitoring recommended.",
    detailHref: "/officer/warnings",
  };
}