import type { MyHealthData, HealthEventRecord } from "@/types/my-health";
import type { VitalReading } from "@/types/vitals";
// Fixed, explicitly labeled demo period. No invented records are added to real history.
const event = (
  id: string,
  day: string,
  symptoms: HealthEventRecord["symptoms"],
  severity: HealthEventRecord["severity"],
  bodyAreas: string[],
  notes: string,
): HealthEventRecord => ({
  id,
  startedAt: day + "T09:30:00+01:00",
  createdAt: day + "T10:00:00+01:00",
  symptoms,
  severity,
  bodyAreas,
  notes,
  customSymptom: "",
  duration: "1-3d",
});
const events: HealthEventRecord[] = [
  {
    ...event(
      "e1",
      "2026-09-20",
      ["Headache", "Fatigue", "Fever"],
      6,
      ["Head"],
      "Feeling tired before bed",
    ),
    recurrence: "Occasional",
    trigger: "Not recorded",
  },
  event("e2", "2026-09-18", ["Cough"], 4, ["Chest"], "Dry cough"),
  event("e3", "2026-09-15", ["Headache"], 3, ["Head"], "Morning check"),
  event("e4", "2026-09-08", ["Body Pain"], 5, ["Back"], "After a walk"),
  event(
    "e5",
    "2026-08-26",
    ["Headache", "Cough"],
    4,
    ["Head", "Chest"],
    "Evening record",
  ),
  event("e6", "2026-07-12", ["Headache"], 2, ["Head"], "Short episode"),
  event("e7", "2026-05-10", ["Fatigue"], 3, [], "Routine entry"),
];
const vitals: VitalReading[] = [
  "2026-09-05",
  "2026-09-12",
  "2026-09-20",
].flatMap((date, index): VitalReading[] => {
  const measuredAt = date + "T19:15:00+01:00";
  return [
    {
      id: "t" + index,
      type: "temperature",
      unit: index === 1 ? "°F" : "°C",
      value: [36.8, 98.6, 36.9][index],
      measuredAt,
      note: "Evening check",
    },
    {
      id: "b" + index,
      type: "blood_pressure",
      unit: "mmHg",
      value: {
        systolic: [118, 120, 116][index],
        diastolic: [76, 78, 75][index],
      },
      measuredAt,
    },
    {
      id: "h" + index,
      type: "heart_rate",
      unit: "BPM",
      value: [72, 75, 70][index],
      measuredAt,
    },
    {
      id: "s" + index,
      type: "spo2",
      unit: "%",
      value: [98, 97, 98][index],
      measuredAt,
    },
    {
      id: "w" + index,
      type: "weight",
      unit: index === 1 ? "lb" : "kg",
      value: [72, 159, 72.2][index],
      measuredAt,
    },
  ];
});
export const demoMyHealth: MyHealthData = {
  events,
  vitals,
  asOf: "2026-09-23T23:59:59+01:00",
};
export const emptyMyHealth: MyHealthData = {
  events: [],
  vitals: [],
  asOf: demoMyHealth.asOf,
};
export const limitedMyHealth: MyHealthData = {
  events: [events[0]],
  vitals: [vitals[0]],
  asOf: demoMyHealth.asOf,
};
