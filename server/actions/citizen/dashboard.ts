// Dev 3 owns this file. Citizen dashboard boundary — real summaries with range selector.
"use server";
import { requireCitizen } from "@/server/auth/rbac";
import { listHealthEvents } from "@/server/services/health-events";
import { listVitalReadings } from "@/server/services/vitals";
import { docIdString } from "@/server/lib/id-utils";
import type { DashboardData } from "@/components/citizen/dashboard/demo-data";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DashboardRange = "1w" | "1m" | "3m";

function severityStatus(maxSeverity: number | null | undefined): string {
  if (!maxSeverity) return "Reported";
  if (maxSeverity <= 3) return "Mild";
  if (maxSeverity <= 6) return "Moderate";
  return "Severe";
}

function formatEventDate(date: Date | undefined): string {
  if (!date) return "";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBucketLabel(date: Date, range: DashboardRange): string {
  if (range === "1w") {
    return date.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }
  if (range === "1m") {
    return date.toLocaleString("en-GB", { day: "numeric", month: "short" });
  }
  return date.toLocaleString("en-GB", { month: "short", year: "2-digit" });
}

function generateBuckets(range: DashboardRange): { label: string; start: number; end: number }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets: { label: string; start: number; end: number }[] = [];

  if (range === "1w") {
    for (let i = 6; i >= 0; i -= 1) {
      const start = todayStart.getTime() - i * DAY_MS;
      const end = start + DAY_MS;
      buckets.push({
        label: formatBucketLabel(new Date(start), range),
        start,
        end,
      });
    }
  } else if (range === "1m") {
    const daysInMonth = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0).getDate();
    const startOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    for (let i = 0; i < daysInMonth; i += 1) {
      const start = startOfMonth.getTime() + i * DAY_MS;
      const end = start + DAY_MS;
      if (start > todayStart.getTime()) break;
      buckets.push({
        label: formatBucketLabel(new Date(start), range),
        start,
        end,
      });
    }
  } else if (range === "3m") {
    const endDate = todayStart;
    const startDate = new Date(todayStart.getFullYear(), todayStart.getMonth() - 2, 1);
    let current = new Date(startDate);
    while (current <= endDate) {
      const weekStart = new Date(current);
      weekStart.setDate(current.getDate() - current.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const bucketStart = weekStart.getTime();
      const bucketEnd = weekEnd.getTime();
      if (bucketStart > endDate.getTime()) break;
      if (bucketEnd > 0) {
        buckets.push({
          label: formatBucketLabel(weekStart, range),
          start: bucketStart,
          end: Math.min(bucketEnd, endDate.getTime() + DAY_MS),
        });
      }
      current = weekEnd;
    }
  }

  return buckets;
}

function getRangeMs(range: DashboardRange): number {
  switch (range) {
    case "1w":
      return 7 * DAY_MS;
    case "1m":
      return 30 * DAY_MS;
    case "3m":
      return 90 * DAY_MS;
  }
}

export async function getDashboardAction(range: DashboardRange = "1w"): Promise<DashboardData> {
  const session = await requireCitizen();
  const userId = session.user?.id;
  if (!userId) throw new Error("Authenticated citizen required");

  const rangeMs = getRangeMs(range);
  const from = new Date(Date.now() - rangeMs);
  const [events, vitals] = await Promise.all([
    listHealthEvents(userId, { from, dateField: "onsetAt" }),
    listVitalReadings(userId, from, new Date()),
  ]);

  const temperature = vitals.find((v) => v.type === "temperature");
  const buckets = generateBuckets(range);
  const activity = buckets.map((bucket) => ({
    label: bucket.label,
    count: events.filter((e) => {
      const t = e.onsetAt?.getTime() ?? 0;
      return t >= bucket.start && t < bucket.end;
    }).length,
  }));

  const signals = events
    .slice(0, 5)
    .map((event) => ({
      id: docIdString(event),
      title: event.symptoms[0]?.name ?? "Report",
      date: formatEventDate(event.onsetAt ?? event.reportedAt),
      status: severityStatus(event.maxSeverity),
    }));

  return {
    symptomsThisWeek: events.length,
    temperature: temperature
      ? `${Number(temperature.value?.numeric ?? 0).toFixed(1)} °C`
      : null,
    activity,
    signals,
  };
}
