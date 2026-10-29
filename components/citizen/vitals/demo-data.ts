import type { VitalReading } from "@/types/vitals";
// Isolated temporary UI examples. Never persisted or merged with real readings.
export const demoVitals: VitalReading[] = [
  {
    id: "demo-1",
    type: "blood_pressure",
    value: { systolic: 118, diastolic: 76 },
    unit: "mmHg",
    measuredAt: "2026-09-20T19:15:00Z",
    note: "Evening check",
  },
  {
    id: "demo-2",
    type: "temperature",
    value: 36.8,
    unit: "°C",
    measuredAt: "2026-09-20T19:15:00Z",
    note: "Before bed",
  },
  {
    id: "demo-3",
    type: "heart_rate",
    value: 72,
    unit: "BPM",
    measuredAt: "2026-09-20T19:15:00Z",
    note: "Evening check",
  },
  {
    id: "demo-4",
    type: "spo2",
    value: 98,
    unit: "%",
    measuredAt: "2026-09-20T19:15:00Z",
  },
  {
    id: "demo-5",
    type: "weight",
    value: 72.5,
    unit: "kg",
    measuredAt: "2026-09-19T07:00:00Z",
    note: "Morning check",
  },
];
export const emptyVitals: VitalReading[] = [];
