import type { VitalType as SharedVitalType } from "./index";
export type VitalType = Extract<
  SharedVitalType,
  "temperature" | "blood_pressure" | "heart_rate" | "spo2" | "weight"
>;
export type VitalDraft = { measuredAt: string; note?: string } & (
  | { type: "temperature"; value: number; unit: "°C" | "°F" }
  | {
      type: "blood_pressure";
      value: { systolic: number; diastolic: number };
      unit: "mmHg";
    }
  | { type: "heart_rate"; value: number; unit: "BPM" }
  | { type: "spo2"; value: number; unit: "%" }
  | { type: "weight"; value: number; unit: "kg" | "lb" }
);
export type VitalReading = VitalDraft & { id: string };
// TODO(DEV3): persist VitalReading and return latest/recent readings, newest first.
// TODO(DEV4): provide authenticated citizen identity and enforce authorization.
export type SaveVital = (draft: VitalDraft) => Promise<VitalReading[]>;
