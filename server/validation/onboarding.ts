import { z } from "zod";
import {
  personalInformationSchema,
  locationSchema,
  privacySchema,
} from "@/components/citizen/onboarding/validation";

export const onboardingDraftSchema = z.object({
  personal: z.object({
    fullName: z.string().max(200),
    dateOfBirth: z.string().max(10),
    gender: z.enum(["", "female", "male", "non_binary", "undisclosed"]),
  }),
  location: z.object({
    country: z.string().max(100),
    state: z.string().max(100),
    district: z.string().max(100),
    community: z.string().max(150),
  }),
  healthProfile: z.object({
    bloodGroup: z.enum([
      "",
      "unknown",
      "A+",
      "A-",
      "B+",
      "B-",
      "AB+",
      "AB-",
      "O+",
      "O-",
    ]),
    allergiesText: z.string().max(4000),
    conditionsText: z.string().max(4000),
    medicationsText: z.string().max(4000),
  }),
  healthProfileSkipped: z.boolean(),
  privacy: z.object({
    personalTrackingAcknowledged: z.boolean(),
    communityContribution: z.object({
      purpose: z.literal("community_insights"),
      decision: z.enum(["granted", "declined"]),
      policyVersion: z.string().nullable(),
      recordedAt: z.string().nullable(),
    }),
  }),
});

export function validateOnboardingStep(input: unknown, step: number) {
  const draft = onboardingDraftSchema.parse(input);
  draft.personal = personalInformationSchema.parse(draft.personal);
  if (step >= 1) draft.location = locationSchema.parse(draft.location);
  if (step >= 3) privacySchema.parse(draft.privacy);
  // Client values cannot establish an authoritative policy version or consent date.
  draft.privacy.communityContribution.policyVersion = null;
  draft.privacy.communityContribution.recordedAt = null;
  return draft;
}
