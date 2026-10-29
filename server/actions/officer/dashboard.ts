// Dev 3 owns this file. Officer dashboard boundary — privacy-safe aggregates
// computed from HealthEvent/PublicAlert data. Counts that fall below the
// privacy floor are suppressed as null (never 0); Dev 4's jurisdiction layer
// remains authoritative for what the officer may see.
"use server";
import { requireLiveOfficer as requireApprovedOfficer } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { HealthEvent, PublicAlert } from "@/server/models";
import { getJurisdiction } from "@/server/services/jurisdictions";
import { docIdString } from "@/server/lib/id-utils";
import type {
  AlertSummary,
  DashboardMetrics,
  MapPreviewSummary,
  SymptomSummary,
  Timeframe,
  WhatChangedToday,
} from "@/lib/services/officer/dashboard";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS: Record<Timeframe, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
};

interface EventShape {
  reportedAt: Date;
  maxSeverity?: number;
  symptoms: { name: string }[];
  jurisdiction?: unknown;
  citizen?: { toString(): string };
}

type Scope = { $in: unknown[] } | undefined;

function sessionScope(scope: string[] | undefined): Scope {
  return scope && scope.length > 0 ? { $in: scope } : undefined;
}

async function fetchEvents(from: Date, to: Date, scope: Scope): Promise<EventShape[]> {
  await connectDB();
  const query: Record<string, unknown> = {
    reportedAt: { $gte: from, $lte: to },
    simulation: { $ne: true },
  };
  if (scope) query.jurisdiction = scope;
  return HealthEvent.find(query).lean() as unknown as Promise<EventShape[]>;
}

function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function suppressIfSmall(value: number): number | null {
  // Privacy: single/double-digit aggregates are suppressed, not zeroed.
  return value >= 3 ? value : null;
}

export async function getDashboardMetricsAction(
  timeframe: Timeframe,
): Promise<DashboardMetrics> {
  const session = await requireApprovedOfficer();
  const days = WINDOW_DAYS[timeframe];
  const now = new Date();
  const currentFrom = new Date(now.getTime() - days * DAY_MS);
  const previousFrom = new Date(now.getTime() - 2 * days * DAY_MS);
  const scope = sessionScope(session.jurisdictionIds);

  const [currentEvents, previousEvents] = await Promise.all([
    fetchEvents(currentFrom, now, scope),
    fetchEvents(previousFrom, currentFrom, scope),
  ]);

  const currentReview = currentEvents.filter(
    (e) => (e.maxSeverity ?? 0) >= 7,
  ).length;
  const previousReview = previousEvents.filter(
    (e) => (e.maxSeverity ?? 0) >= 7,
  ).length;

  const citizens = new Set(
    currentEvents.map((e) => e.citizen?.toString()).filter(Boolean),
  );

  const signals = new Set(
    currentEvents.map(
      (e) => `${e.jurisdiction?.toString() ?? ""}:${e.symptoms[0]?.name ?? ""}`,
    ),
  );

  return {
    activeSignals: suppressIfSmall(signals.size),
    activeSignalsChange: null,
    requiresReview: suppressIfSmall(currentReview),
    requiresReviewChange: changePercent(currentReview, previousReview) ?? 0,
    newReports: currentEvents.length,
    newReportsChange:
      changePercent(currentEvents.length, previousEvents.length) ?? 0,
    peopleReached: suppressIfSmall(citizens.size),
    peopleReachedChange: null,
  };
}

export async function getMapPreviewSummaryAction(): Promise<MapPreviewSummary> {
  const session = await requireApprovedOfficer();
  const scope = sessionScope(session.jurisdictionIds);
  const from = new Date(Date.now() - 30 * DAY_MS);
  const events = await fetchEvents(from, new Date(), scope);

  let highCount = 0;
  let moderateCount = 0;
  let lowCount = 0;
  for (const e of events) {
    const severity = e.maxSeverity ?? 0;
    if (severity >= 7) highCount += 1;
    else if (severity >= 4) moderateCount += 1;
    else lowCount += 1;
  }

  let jurisdiction = "National overview";
  const firstJurisdiction = session.jurisdictionIds?.[0];
  if (firstJurisdiction) {
    const doc = await getJurisdiction(firstJurisdiction);
    if (doc) jurisdiction = doc.name;
  }

  return {
    highCount,
    moderateCount,
    lowCount,
    lastUpdated: new Date().toISOString(),
    jurisdiction,
  };
}

export async function getTopSymptomsAction(
  timeframe: Timeframe,
): Promise<SymptomSummary[]> {
  const session = await requireApprovedOfficer();
  const days = WINDOW_DAYS[timeframe];
  const from = new Date(Date.now() - days * DAY_MS);
  const events = await fetchEvents(from, new Date(), sessionScope(session.jurisdictionIds));

  const counts = new Map<string, { count: number; severitySum: number }>();
  for (const e of events) {
    for (const symptom of e.symptoms) {
      const entry = counts.get(symptom.name) ?? { count: 0, severitySum: 0 };
      entry.count += 1;
      entry.severitySum += e.maxSeverity ?? 5;
      counts.set(symptom.name, entry);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, entry], index) => {
      const avg = entry.severitySum / entry.count;
      return {
        rank: index + 1,
        name,
        count: entry.count,
        severity: avg >= 7 ? "high" : avg >= 4 ? "moderate" : "low",
      };
    });
}

export async function getRecentAlertsAction(): Promise<AlertSummary[]> {
  const session = await requireApprovedOfficer();
  await connectDB();
  const alerts = await PublicAlert.find({ status: "published", simulation: { $ne: true }, jurisdiction: { $in: session.jurisdictionIds } })
    .sort({ publishedAt: -1 })
    .limit(8)
    .lean();

  return alerts.map((a) => ({
    id: docIdString(a),
    title: a.title,
    description: a.body ?? "No additional details.",
    urgency: mapAlertUrgency(a.level),
    timestamp: (a.publishedAt ?? a.createdAt).toISOString(),
    href: `/officer/alerts/${docIdString(a)}`,
  }));
}

function mapAlertUrgency(level: string): AlertSummary["urgency"] {
  if (level === "critical" || level === "warning") return "urgent";
  if (level === "watch") return "warning";
  return "info";
}

export async function getWhatChangedTodayAction(): Promise<WhatChangedToday> {
  const session = await requireApprovedOfficer();
  const now = new Date();
  const last7 = new Date(now.getTime() - 7 * DAY_MS);
  const previous = new Date(now.getTime() - 14 * DAY_MS);

  const [recent, prior] = await Promise.all([
    fetchEvents(last7, now, sessionScope(session.jurisdictionIds)),
    fetchEvents(previous, last7, sessionScope(session.jurisdictionIds)),
  ]);

  const tally = (events: EventShape[]) => {
    const map = new Map<string, number>();
    for (const e of events) {
      for (const s of e.symptoms) {
        map.set(s.name, (map.get(s.name) ?? 0) + 1);
      }
    }
    return map;
  };

  const recentTally = tally(recent);
  const priorTally = tally(prior);
  const top = [...recentTally.entries()].sort((a, b) => b[1] - a[1])[0];

  let summary =
    "No notable change in reported symptoms over the last 7 days.";
  if (top) {
    const priorCount = priorTally.get(top[0]) ?? 0;
    const delta =
      priorCount > 0
        ? `${Math.round(((top[1] - priorCount) / priorCount) * 100)}`
        : "new";
    summary = `${top[0]} reports ${delta === "new" ? "appeared" : `changed by ${delta}%`} compared with the prior 7 days (${top[1]} recent reports).`;
  }

  return {
    summary,
    aiCaption: null,
    detailHref: "/officer/alerts",
  };
}