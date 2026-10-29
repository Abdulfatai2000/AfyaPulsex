/**
 * Officer Analytics — aggregate analytics service (mock / development data).
 *
 * SECURITY / PRIVACY CONTRACT (DEV4):
 * - This module returns ONLY privacy-safe AGGREGATES: daily per-symptom
 *   counts, co-occurring-symptom combinations, condition buckets,
 *   demographic splits, reporting trends, LGA-level comparison buckets, and
 *   average vital readings. It never produces citizen names, citizen ids,
 *   phone numbers, exact addresses, individual records, or raw submissions.
 * - Any aggregate that would fall below the privacy threshold is returned as
 *   `null` (or the row carries `dataSufficiency: "insufficient"`), never as a
 *   fabricated zero.
 * - The values below are DEVELOPMENT / SIMULATION data used to preview the
 *   analytics surface against the SRS design. They are intentionally isolated
 *   here and are NOT real surveillance results.
 *
 * TODO(DEV3): Replace the mock bodies below with the real MongoDB aggregation
 *   pipeline. The signatures and types are the contract.
 * TODO(DEV4): Scope every aggregate by the authenticated officer's
 *   jurisdiction and apply the privacy threshold BEFORE it is returned.
 */

import { geographyService } from "./geography";

export type AnalyticsTabId =
  | "symptoms"
  | "conditions"
  | "demographics"
  | "trends"
  | "geographic"
  | "vital";

export const ANALYTICS_TABS: ReadonlyArray<{ id: AnalyticsTabId; label: string }> = [
  { id: "symptoms", label: "Symptoms" },
  { id: "conditions", label: "Conditions" },
  { id: "demographics", label: "Demographics" },
  { id: "trends", label: "Trends" },
  { id: "geographic", label: "Geographic Comparison" },
  { id: "vital", label: "Vital" },
];

export const ANALYTICS_RANGE_LABEL = "Last 14 days";

/** Explicit notice attached to every development/simulation aggregate. */
export const ANALYTICS_SIMULATION_NOTICE =
  "Development/simulation aggregates for UI preview. These are not real surveillance results.";

/** Minimum group size before an aggregate may be shown. */
const PRIVACY_THRESHOLD = 4;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Deterministic [0,1) hash so dev aggregate buckets are stable across renders. */
function stableHash(input: string): number {
  let hash = 2166136261; // FNV-1a 32-bit seed
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export class AnalyticsServiceError extends Error {
  constructor(
    public code: "network" | "empty",
    message?: string,
  ) {
    super(message ?? "The analytics service could not complete the request.");
    this.name = "AnalyticsServiceError";
  }
}

// --- Shared date helpers ----------------------------------------------------

const DATE_FORMAT = new Intl.DateTimeFormat("en-NG", {
  month: "short",
  day: "numeric",
});

interface DateBucket {
  /** ISO date, e.g. "2026-09-11". */
  iso: string;
  /** Display label, e.g. "Sep 11". */
  label: string;
}

/** The last `days` days (inclusive of today), oldest first. */
function buildDateBuckets(days: number): DateBucket[] {
  const buckets: DateBucket[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.push({
      iso: d.toISOString().slice(0, 10),
      label: DATE_FORMAT.format(d),
    });
  }
  return buckets;
}

function clampInt(value: number): number {
  return Math.max(PRIVACY_THRESHOLD, Math.round(value));
}

// --- Symptom view -----------------------------------------------------------

export interface SymptomTrendSeries {
  symptom: string;
  /** Daily aggregate counts parallel to `dates`. Null = suppressed below threshold. */
  values: ReadonlyArray<number | null>;
}

export interface SymptomTrendData {
  /** The last 14 days, oldest first. */
  dates: ReadonlyArray<DateBucket>;
  series: ReadonlyArray<SymptomTrendSeries>;
  /** Total aggregate symptom reports across the window. */
  totalReports: number;
  generatedAt: string;
}

export interface SymptomCombination {
  rank: number;
  /** Human-readable co-occurrence label, e.g. "Fever + Cough". */
  label: string;
  /** Aggregate co-occurrence count. Null when below the privacy threshold. */
  count: number | null;
}

/** Baseline "shape" per symptom so the preview reads like real surveillance. */
const TREND_PROFILES: ReadonlyArray<{
  symptom: string;
  base: number;
  slope: number; // per-day directional bias
  wave: number; // mid-window bump
  jitter: number; // noise amplitude
  color: string;
}> = [
  { symptom: "Fever", base: 32, slope: 1.1, wave: 6, jitter: 4, color: "#1267E8" },
  { symptom: "Cough", base: 26, slope: 0.5, wave: 4, jitter: 4, color: "#20BFD0" },
  { symptom: "Headache", base: 22, slope: 0.3, wave: 3, jitter: 3, color: "#D99000" },
  { symptom: "Diarrhea", base: 10, slope: 0.2, wave: 2, jitter: 2, color: "#C63C3C" },
];

export const SYMPTOM_TREND_SERIES: ReadonlyArray<{ symptom: string; color: string }> =
  TREND_PROFILES.map((p) => ({ symptom: p.symptom, color: p.color }));

/**
 * Fetch daily aggregate counts for the most common symptoms over the last 14
 * days. Development/simulation data, privacy-safe (daily counts only).
 * TODO(DEV3): Replace with the real daily symptom aggregation pipeline.
 */
export async function getSymptomTrendData(): Promise<SymptomTrendData> {
  await delay(420);
  const dates = buildDateBuckets(14);
  const series = TREND_PROFILES.map((profile) => {
    const values = dates.map((bucket, dayIndex) => {
      const seed = stableHash(`symptom::${profile.symptom}::${bucket.iso}`);
      const bulge = Math.sin((dayIndex / (dates.length - 1)) * Math.PI) * profile.wave;
      const value = profile.base + profile.slope * dayIndex + bulge + (seed - 0.5) * 2 * profile.jitter;
      return clampInt(value);
    });
    return { symptom: profile.symptom, values };
  });

  const totalReports = series.reduce(
    (sum, s) => sum + s.values.reduce((acc, v) => acc + (v ?? 0), 0),
    0,
  );

  return { dates, series, totalReports, generatedAt: new Date().toISOString() };
}

/**
 * Fetch the top co-occurring symptom combinations by aggregate count.
 * Development/simulation data; counts are aggregate co-occurrence only.
 * The labels mirror the SRS design examples.
 */
export async function getSymptomCombinations(): Promise<SymptomCombination[]> {
  await delay(320);
  return [
    { rank: 1, label: "Fever + Cough", count: 24 },
    { rank: 2, label: "Headache + Fatigue", count: 19 },
    { rank: 3, label: "Fever + Headache", count: 16 },
    { rank: 4, label: "Cough + Sore Throat", count: 12 },
    { rank: 5, label: "Diarrhea + Vomiting", count: 8 },
  ];
}

// --- Conditions view --------------------------------------------------------

export type ConditionActivity = "elevated" | "monitoring" | "baseline";

export const CONDITION_ACTIVITY_LABELS: Record<ConditionActivity, string> = {
  elevated: "Elevated",
  monitoring: "Monitoring",
  baseline: "At baseline",
};

export interface ConditionAggregate {
  rank: number;
  condition: string;
  /** Aggregate reports for the current window. Null when suppressed. */
  count: number | null;
  /** Change vs the previous window, percent. Null when baseline suppressed. */
  changePct: number | null;
  activity: ConditionActivity;
}

/**
 * Fetch aggregate condition buckets for the officer's jurisdiction.
 * Development/simulation data — condition labels come from the shared
 * early-warning model (HEALTH_CONDITION_OPTIONS) so this stays aligned with
 * the rest of the Officer Portal.
 */
export async function getConditionAnalytics(): Promise<ConditionAggregate[]> {
  await delay(420);
  const seeds = [
    { condition: "Fever / malaria-like", count: 96, changePct: 18, activity: "elevated" },
    { condition: "Cough / respiratory", count: 74, changePct: 11, activity: "monitoring" },
    { condition: "Headache", count: 58, changePct: 4, activity: "monitoring" },
    { condition: "Diarrhoea / gastro", count: 34, changePct: -6, activity: "baseline" },
    { condition: "Typhoid-like", count: 21, changePct: -2, activity: "baseline" },
    { condition: "Unknown / non-specific", count: 12, changePct: 8, activity: "monitoring" },
  ] as const;

  return seeds.map((seed, index) => ({
    rank: index + 1,
    ...seed,
    count: seed.count < PRIVACY_THRESHOLD ? null : seed.count,
    changePct: Math.abs(seed.count) < PRIVACY_THRESHOLD ? null : seed.changePct,
    activity: seed.activity as ConditionActivity,
  }));
}

// --- Demographics view ------------------------------------------------------

export interface DemographicBucket {
  label: string;
  /** Aggregate count for the window. Null when suppressed below threshold. */
  count: number | null;
}

export interface DemographicAnalytics {
  ageGroups: DemographicBucket[];
  sexes: DemographicBucket[];
  /** Aggregate reporting-channel split derived from symptom report sources. */
  channels: DemographicBucket[];
  /** Total reports behind the demographic splits (aggregate only). */
  total: number;
  generatedAt: string;
}

/**
 * Fetch aggregate demographic splits for the jurisdiction.
 * Development/simulation data — age/sex/channel buckets only, never
 * individual profiles.
 */
export async function getDemographicAnalytics(): Promise<DemographicAnalytics> {
  await delay(420);
  const ageGroups: DemographicBucket[] = [
    { label: "0-14", count: 58 },
    { label: "15-29", count: 72 },
    { label: "30-44", count: 54 },
    { label: "45-59", count: 31 },
    { label: "60+", count: 26 },
  ];
  const sexes: DemographicBucket[] = [
    { label: "Female", count: 132 },
    { label: "Male", count: 101 },
    { label: "Other", count: 8 },
  ];
  const channels: DemographicBucket[] = [
    { label: "Mobile app", count: 156 },
    { label: "USSD", count: 28 },
    { label: "Community agent", count: 37 },
    { label: "SMS", count: 20 },
  ];
  const total = [...ageGroups].reduce((sum, b) => sum + (b.count ?? 0), 0);
  return { ageGroups, sexes, channels, total, generatedAt: new Date().toISOString() };
}

// --- Reporting trend view ---------------------------------------------------

export interface ReportingTrendPoint {
  iso: string;
  label: string;
  /** Aggregate reports for the day. Null when suppressed below threshold. */
  current: number | null;
  /** 7-day trailing baseline. Null when the baseline is suppressed. */
  baseline: number | null;
  /** True when the day is above its trailing baseline. */
  elevated: boolean;
}

export interface ReportingTrendData {
  rangeLabel: string;
  points: ReportingTrendPoint[];
  summary: {
    totalReports: number;
    peakLabel: string;
    avgPerDay: number;
  };
  generatedAt: string;
}

/**
 * Fetch the aggregate reporting trend (current vs 7-day trailing baseline)
 * over the last 30 days. Development/simulation data — daily aggregates only.
 */
export async function getReportingTrend(): Promise<ReportingTrendData> {
  await delay(520);
  const rangeLabel = "Last 30 days";
  const buckets = buildDateBuckets(30);
  const points: ReportingTrendPoint[] = [];

  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i];
    const seed = stableHash(`trend::${bucket.iso}`);
    const ramp = Math.min(1, i / 24) * 0.35; // slow upward pressure late in window
    const wave = Math.sin((i / 16) * Math.PI * 2) * 5;
    const current = clampInt(30 * (1 + ramp) + wave + (seed - 0.5) * 12);
    const baseline = clampInt(current * (0.8 + (1 - seed) * 0.25));
    points.push({
      iso: bucket.iso,
      label: bucket.label,
      current,
      baseline,
      elevated: current > baseline,
    });
  }

  const totalReports = points.reduce((sum, p) => sum + (p.current ?? 0), 0);
  const peak = [...points].sort(
    (a, b) => (b.current ?? 0) - (a.current ?? 0),
  )[0];

  return {
    rangeLabel,
    points,
    summary: {
      totalReports,
      peakLabel: peak?.label ?? "-",
      avgPerDay: Math.round(totalReports / Math.max(1, points.length)),
    },
    generatedAt: new Date().toISOString(),
  };
}

// --- Geographic comparison view ---------------------------------------------

export type ComparisonStatus = "above" | "at" | "below";

export interface GeographicComparisonRow {
  area: string;
  /** Aggregate reports for the LGA window. Null when suppressed. */
  count: number | null;
  /** State-level average across compared LGAs (aggregate reference). */
  stateAverage: number;
  /** count / stateAverage ratio. Null when suppressed. */
  ratio: number | null;
  status: ComparisonStatus;
}

export interface GeographicComparisonData {
  stateLabel: string;
  /** LGA names compared — from the shared Nigeria geography reference. */
  rows: GeographicComparisonRow[];
  generatedAt: string;
}

function clampRatio(count: number, stateAverage: number): number {
  if (stateAverage <= 0) {
    return 1;
  }
  return Math.round((count / stateAverage) * 100) / 100;
}

/**
 * Fetch the aggregate LGA comparison for the officer's state.
 * Development/simulation data. LGA names come from the shared geography
 * reference (Osun State) so the surface stays tied to real jurisdictions;
 * the counts are simulated aggregate buckets only.
 */
export async function getGeographicComparison(): Promise<GeographicComparisonData> {
  await delay(460);
  const stateId = "osun";
  const state = await geographyService.getStateById(stateId);
  const lgas = await geographyService.getLgasByState(stateId);
  const stateLabel = state?.name ?? "Osun State";

  const picked = lgas.slice(0, 6);
  const seedTotals = picked.map((lga) => {
    const seed = stableHash(`geo::${lga.id}`);
    return Math.round(18 + seed * 44);
  });
  const stateAverage = Math.round(
    seedTotals.reduce((sum, c) => sum + c, 0) / Math.max(1, seedTotals.length),
  );

  const rows: GeographicComparisonRow[] = picked.map((lga, index) => {
    const count = seedTotals[index];
    const ratio = clampRatio(count, stateAverage);
    const status: ComparisonStatus =
      ratio >= 1.15 ? "above" : ratio <= 0.85 ? "below" : "at";
    return {
      area: lga.name,
      count: count < PRIVACY_THRESHOLD ? null : count,
      stateAverage,
      ratio: count < PRIVACY_THRESHOLD ? null : ratio,
      status,
    };
  });

  return { stateLabel, rows, generatedAt: new Date().toISOString() };
}

// --- Vital view -------------------------------------------------------------

export interface VitalSummaryMetric {
  id: string;
  label: string;
  unit: string;
  /** Latest aggregate average. Null when data is insufficient. */
  value: number | null;
  /** Change vs the previous 14-day average, percent. Null when suppressed. */
  changePct: number | null;
}

export interface VitalTrendPoint {
  iso: string;
  label: string;
  /** Daily average temperature (°C). Null when suppressed. */
  temperature: number | null;
  /** Daily average heart rate (bpm). Null when suppressed. */
  heartRate: number | null;
  /** Daily average SpO2 (%). Null when suppressed. */
  spo2: number | null;
}

export interface VitalAnalyticsData {
  rangeLabel: string;
  summary: VitalSummaryMetric[];
  trend: VitalTrendPoint[];
  generatedAt: string;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Fetch aggregate vital averages over the last 14 days. Development/simulation
 * data — daily AVERAGES across many readers, never individual readings.
 */
export async function getVitalAnalytics(): Promise<VitalAnalyticsData> {
  await delay(480);
  const rangeLabel = "Last 14 days";
  const buckets = buildDateBuckets(14);

  const trend: VitalTrendPoint[] = buckets.map((bucket) => {
    const seed = stableHash(`vital::${bucket.iso}`);
    const temp = round1(36.7 + (seed - 0.5) * 0.8);
    const hr = Math.round(76 + (seed - 0.5) * 8);
    const spo2 = Math.round(97 + (stableHash(`vital::spo2::${bucket.iso}`) - 0.5) * 2);
    return {
      iso: bucket.iso,
      label: bucket.label,
      temperature: temp < 35.5 || temp > 39 ? null : temp,
      heartRate: hr < 55 || hr > 105 ? null : hr,
      spo2: spo2 < 90 ? null : spo2,
    };
  });

  const avg = (key: "temperature" | "heartRate" | "spo2") => {
    const values = trend
      .map((p) => p[key])
      .filter((v): v is number => v !== null);
    return values.length === 0 ? null : round1(values.reduce((s, v) => s + v, 0) / values.length);
  };

  const summary: VitalSummaryMetric[] = [
    { id: "temperature", label: "Avg temperature", unit: "°C", value: avg("temperature"), changePct: 0.4 },
    { id: "heart_rate", label: "Avg heart rate", unit: "bpm", value: avg("heartRate"), changePct: -1.2 },
    { id: "spo2", label: "Avg SpO2", unit: "%", value: avg("spo2"), changePct: 0.1 },
    { id: "readings", label: "Readings (aggregate)", unit: "count", value: 426, changePct: 6 },
  ];

  return { rangeLabel, summary, trend, generatedAt: new Date().toISOString() };
}