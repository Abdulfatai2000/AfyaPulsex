import { z } from "zod";
import type { VitalDraft } from "@/types/vitals";

export const NOTE_LIMIT = 400;
const numeric = z
  .string()
  .trim()
  .min(1, "Enter a measurement.")
  .refine(
    (value) =>
      /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value) &&
      Number.isFinite(Number(value)),
    "Enter a finite number.",
  )
  .transform(Number);
const positive = numeric.refine(
  (value) => value > 0,
  "Enter a value greater than zero.",
);
const measurement = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("temperature"),
    value: numeric,
    unit: z.enum(["°C", "°F"]),
  }),
  z.object({
    type: z.literal("blood_pressure"),
    systolic: positive,
    diastolic: positive,
    unit: z.literal("mmHg"),
  }),
  z.object({
    type: z.literal("heart_rate"),
    value: positive,
    unit: z.literal("BPM"),
  }),
  z.object({
    type: z.literal("spo2"),
    value: numeric.refine(
      (value) => value >= 0 && value <= 100,
      "Enter a percentage from 0 to 100.",
    ),
    unit: z.literal("%"),
  }),
  z.object({
    type: z.literal("weight"),
    value: positive,
    unit: z.enum(["kg", "lb"]),
  }),
]);
const timing = z
  .object({
    date: z.iso.date("Enter a valid measurement date."),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid measurement time."),
    note: z
      .string()
      .max(NOTE_LIMIT, `Keep the note to ${NOTE_LIMIT} characters or fewer.`)
      .trim(),
  })
  .superRefine((value, ctx) => {
    const date = new Date(`${value.date}T${value.time}:00`);
    if (!Number.isFinite(date.getTime())) return;
    // Reject local times that are normalised (e.g. a skipped daylight-saving hour).
    if (
      date.getFullYear() !== Number(value.date.slice(0, 4)) ||
      date.getMonth() + 1 !== Number(value.date.slice(5, 7)) ||
      date.getDate() !== Number(value.date.slice(8, 10)) ||
      date.getHours() !== Number(value.time.slice(0, 2)) ||
      date.getMinutes() !== Number(value.time.slice(3, 5))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["time"],
        message: "Enter a valid local measurement date and time.",
      });
    } else if (date.getTime() > Date.now()) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "The measurement date and time cannot be in the future.",
      });
    }
  });
export const vitalEntrySchema = z
  .intersection(measurement, timing)
  .transform((entry): VitalDraft => {
    const base = {
      measuredAt: new Date(`${entry.date}T${entry.time}:00`).toISOString(),
      note: entry.note || undefined,
    };
    switch (entry.type) {
      case "blood_pressure":
        return {
          ...base,
          type: entry.type,
          unit: entry.unit,
          value: { systolic: entry.systolic, diastolic: entry.diastolic },
        };
      default:
        return {
          ...base,
          type: entry.type,
          unit: entry.unit,
          value: entry.value,
        } as VitalDraft;
    }
  });

export function localMeasurementTime(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}
