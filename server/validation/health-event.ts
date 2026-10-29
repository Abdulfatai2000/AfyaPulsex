// Shared Zod schema for health events — supports MULTIPLE symptoms per event,
// severity 1-10, timing fields. Whole team contributes; Dev 4 reviews.
import { z } from "zod";

export const symptomEntrySchema = z.object({
  name: z.string().trim().min(1),
  severity: z.number().int().min(1).max(10),
  startedAt: z.coerce.date().optional(),
  durationHours: z.number().min(0).optional(),
  notes: z.string().trim().optional(),
});

export const reportHealthEventSchema = z.object({
  symptoms: z.array(symptomEntrySchema).min(1, "At least one symptom required"),
  maxSeverity: z.number().int().min(1).max(10).optional(),
  onsetAt: z.coerce.date().optional(),
  duration: z
    .enum(["<1h", "1-6h", "6-24h", "1-3d", "4-7d", "1w+"])
    .optional(),
  bodyArea: z.array(z.string().trim()).optional(),
  location: z
    .object({
      type: z.literal("Point").default("Point"),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
  notes: z.string().trim().optional(),
});

export type ReportHealthEventInput = z.infer<typeof reportHealthEventSchema>;
