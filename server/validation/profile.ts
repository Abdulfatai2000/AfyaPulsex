import { z } from "zod";
import { onboardingDraftSchema } from "./onboarding";

export const healthProfileSettingsSchema = z.object({
  bloodGroup: onboardingDraftSchema.shape.healthProfile.shape.bloodGroup,
  allergies: z.array(z.string().trim().min(1).max(200)).max(100),
  conditions: z.array(z.string().trim().min(1).max(200)).max(100),
  medications: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Enter a medication name.").max(200),
        dosage: z.string().trim().max(100),
        frequency: z.string().trim().max(100),
      }),
    )
    .max(100),
});
export type HealthProfileSettings = z.infer<typeof healthProfileSettingsSchema>;
