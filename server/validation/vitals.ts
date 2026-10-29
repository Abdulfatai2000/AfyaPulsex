// Shared Zod schema for vital readings. Whole team contributes; Dev 4 reviews.
import { z } from "zod";

export const vitalTypeSchema = z.enum([
  "blood_pressure",
  "heart_rate",
  "temperature",
  "spo2",
  "weight",
  "glucose",
  "respiration_rate",
]);

export const recordVitalReadingSchema = z.object({
  type: vitalTypeSchema,
  value: z
    .object({
      systolic: z.number().min(0).optional(),
      diastolic: z.number().min(0).optional(),
      numeric: z.number().optional(),
    })
    .refine(
      (v) =>
        v.systolic !== undefined ||
        v.diastolic !== undefined ||
        v.numeric !== undefined,
      "At least one value field is required",
    ),
  unit: z.string().trim().optional(),
  takenAt: z.coerce.date().optional(),
  source: z
    .enum(["manual", "device", "fhbs_record", "imported"])
    .default("manual"),
  notes: z.string().trim().optional(),
});

export type RecordVitalReadingInput = z.infer<typeof recordVitalReadingSchema>;
