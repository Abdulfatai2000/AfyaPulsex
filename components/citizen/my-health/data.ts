import type {
  HealthEventRecord,
  HealthInsight,
  MyHealthData,
  TimelineItem,
} from "@/types/my-health";
import type { VitalType } from "@/types/vitals";
export const ranges = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  "180": "Last 180 days",
  all: "All time",
} as const;
export type DateRange = keyof typeof ranges;
export function dayKey(at: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}
export function symptoms(event: HealthEventRecord): string[] {
  return [
    ...new Set([
      ...event.symptoms,
      ...(event.customSymptom.trim() ? [event.customSymptom.trim()] : []),
    ]),
  ];
}
export function timeline(data: MyHealthData): TimelineItem[] {
  return [
    ...data.events.map((record) => ({
      kind: "event" as const,
      id: "event-" + record.id,
      at: record.startedAt,
      record,
    })),
    ...data.vitals.map((record) => ({
      kind: "vital" as const,
      id: "vital-" + record.id,
      at: record.measuredAt,
      record,
    })),
  ].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id),
  );
}
export function inRange(at: string, range: DateRange, asOf: string) {
  const end = Date.parse(asOf);
  const start =
    range === "all"
      ? -Infinity
      : Date.parse(dayKey(asOf) + "T00:00:00+01:00") -
        (Number(range) - 1) * 86400000;
  return Date.parse(at) >= start && Date.parse(at) <= end;
}
export function periodData(data: MyHealthData, range: DateRange): MyHealthData {
  return {
    ...data,
    events: data.events.filter((e) => inRange(e.startedAt, range, data.asOf)),
    vitals: data.vitals.filter((v) => inRange(v.measuredAt, range, data.asOf)),
  };
}
export function counts(values: string[]) {
  const result = new Map<string, number>();
  for (const value of values) result.set(value, (result.get(value) || 0) + 1);
  return [...result]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
export function symptomCounts(data: MyHealthData) {
  return counts(data.events.flatMap(symptoms));
}
export function bodyCounts(data: MyHealthData) {
  return counts(data.events.flatMap((e) => [...new Set(e.bodyAreas || [])]));
}
export function symptomSeries(data: MyHealthData) {
  return counts(
    data.events.flatMap((e) => symptoms(e).map(() => dayKey(e.startedAt))),
  )
    .map((row) => ({ date: row.name, count: row.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
// Count each symptom once per signal, matching symptomCounts. Only recorded days
// are included: a zero means absent from those signals, not a symptom-free day.
export function symptomLineSeries(data: MyHealthData) {
  const names = [...new Set(data.events.flatMap(symptoms))].sort((a, b) =>
    a.localeCompare(b),
  );
  const series = names.map((label, index) => ({
    key: `symptom_${index}`,
    label,
  }));
  const days = new Map<string, Record<string, number>>();
  for (const event of data.events) {
    const day = dayKey(event.startedAt);
    const values =
      days.get(day) ?? Object.fromEntries(series.map(({ key }) => [key, 0]));
    const recorded = new Set(symptoms(event));
    for (const { key, label } of series)
      if (recorded.has(label)) values[key] += 1;
    days.set(day, values);
  }
  return {
    series,
    rows: [...days]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([date, values]): { date: string; [key: string]: string | number } => ({
          date,
          ...values,
        }),
      ),
  };
}

export function severitySeries(data: MyHealthData) {
  return [...data.events]
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
    .map((e) => ({ date: e.startedAt, severity: e.severity }));
}
export function vitalSeries(data: MyHealthData, type: VitalType) {
  return data.vitals
    .filter((v) => v.type === type)
    .sort((a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt))
    .map((v) => {
      if (v.type === "blood_pressure")
        return {
          date: v.measuredAt,
          systolic: v.value.systolic,
          diastolic: v.value.diastolic,
        };
      const value =
        v.type === "temperature" && v.unit === "°F"
          ? ((v.value - 32) * 5) / 9
          : v.type === "weight" && v.unit === "lb"
            ? v.value * 0.45359237
            : v.value;
      return { date: v.measuredAt, value: Number(value.toFixed(2)) };
    });
}
export function insights(data: MyHealthData): HealthInsight[] {
  const items = timeline(data);
  if (items.length < 2) return [];
  const top = symptomCounts(data);
  const areas = bodyCounts(data);
  const result: HealthInsight[] = [
    {
      id: "activity",
      title: "Recording activity",
      observation: `The loaded records cover ${new Set(items.map((i) => dayKey(i.at))).size} days with health signals or vital measurements in this period.`,
    },
    {
      id: "vitals",
      title: "Vital recording activity",
      observation: `You recorded ${data.vitals.length} vital readings in this period. These readings are available in your timeline.`,
    },
  ];
  if (top.length) {
    const ties = top.filter((t) => t.count === top[0].count);
    result.unshift({
      id: "symptoms",
      title:
        ties.length > 1
          ? "Most recorded symptoms (tie)"
          : "Most recorded symptom",
      observation: `${ties.map((t) => t.name).join(", ")} appeared in ${top[0].count} health signals${ties.length > 1 ? " each" : ""} during this period.`,
    });
  }
  if (areas.length) {
    const ties = areas.filter((a) => a.count === areas[0].count);
    result.push({
      id: "body",
      title: "Common recorded body area",
      observation: `${ties.map((a) => a.name).join(", ")} appeared in ${areas[0].count} health signals${ties.length > 1 ? " each" : ""} during this period.`,
    });
  }
  return result;
}
