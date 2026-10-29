// Dev 3 owns this file. Citizen onboarding boundary — persists the personal,
// location, health-profile and consent drafts from the first-run flow into the
// CitizenProfile / HealthProfile records.
"use server";
import { accountIsDemo } from "@/server/services/account-environment";
import { getCitizenOnboarding } from "@/server/services/citizen-onboarding";
import { validateOnboardingStep } from "@/server/validation/onboarding";
import { User } from "@/server/models/User";
import {
  getCitizenProfile,
  updateCitizenProfile,
} from "@/server/services/citizen-profile";
import { updateHealthProfile } from "@/server/services/health-profile";
import { docIdString } from "@/server/lib/id-utils";
import type { HealthProfile } from "@/server/models";
import type { OnboardingDraft } from "@/types/onboarding";

export interface OnboardingResult {
  ok: true;
  name: string;
  dateOfBirth: string | null;
  addressState: string;
  addressDistrict: string;
  community: string;
  bloodType: string;
  consent: {
    purpose: "community_insights";
    granted: boolean;
    policyVersion: string | null;
  };
}

export async function submitOnboardingAction(
  draft: OnboardingDraft,
): Promise<OnboardingResult> {
  const state = await getCitizenOnboarding();
  if (await accountIsDemo(state.userId)) throw new Error("Demo accounts are read-only.");
  if (state.step < 3 && !state.complete)
    throw new Error("Complete the earlier onboarding steps first.");
  draft = validateOnboardingStep(draft, 3);
  const userId = state.userId;

  const { personal, location, healthProfile, privacy } = draft;

  await updateCitizenProfile(userId, {
    dateOfBirth: personal.dateOfBirth
      ? new Date(personal.dateOfBirth)
      : undefined,
    gender: personal.gender || "undisclosed",
    address: {
      street: "",
      state: location.state,
      district: location.district,
      community: location.community,
      country: location.country || "NG",
    },
    bloodType:
      healthProfile.bloodGroup === "" ? "unknown" : healthProfile.bloodGroup,
  });

  const profile = await getCitizenProfile(userId);
  const citizenProfileId = profile ? docIdString(profile) : undefined;
  if (!citizenProfileId) throw new Error("Your profile could not be saved.");

  if (citizenProfileId && !draft.healthProfileSkipped) {
    const medications: HealthProfile["medications"] = splitMedications(
      healthProfile.medicationsText,
    ) as HealthProfile["medications"];
    await updateHealthProfile(citizenProfileId, {
      allergies: splitLines(healthProfile.allergiesText),
      chronicConditions: splitLines(healthProfile.conditionsText),
      medications,
      bloodType:
        healthProfile.bloodGroup === "" ? "unknown" : healthProfile.bloodGroup,
    });
  }

  // Persist the preference, not an active grant: approved policy versions and
  // the authoritative consent service are not implemented yet.
  const granted = false;
  const completion = await User.updateOne(
    { _id: userId, role: "citizen" },
    {
      $set: {
        name: personal.fullName,
        onboardingDraft: draft,
        onboardingStep: 3,
        onboardingCompletedAt: new Date(),
      },
    },
    { runValidators: true },
  );
  if (completion.matchedCount !== 1)
    throw new Error("Your onboarding completion could not be saved.");

  return {
    ok: true,
    name: personal.fullName,
    dateOfBirth: personal.dateOfBirth
      ? new Date(personal.dateOfBirth).toISOString()
      : null,
    addressState: location.state,
    addressDistrict: location.district,
    community: location.community,
    bloodType:
      healthProfile.bloodGroup === "" ? "unknown" : healthProfile.bloodGroup,
    consent: {
      purpose: "community_insights",
      granted,
      policyVersion: privacy.communityContribution.policyVersion ?? null,
    },
  };
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitMedications(text: string): { name: string }[] {
  return splitLines(text).map((line) => ({ name: line }));
}
export async function saveOnboardingStepAction(
  input: OnboardingDraft,
  step: number,
) {
  if (!Number.isInteger(step) || step < 0 || step > 2)
    throw new Error("Invalid onboarding step.");
  const state = await getCitizenOnboarding();
  if (await accountIsDemo(state.userId)) throw new Error("Demo accounts are read-only.");
  if (state.complete) throw new Error("Onboarding is already complete.");
  if (step > state.step)
    throw new Error("Complete the earlier onboarding steps first.");
  const draft = validateOnboardingStep(input, step);
  // Preserve later confirmed progress when reviewing an earlier step.
  const nextStep = Math.max(state.step, step + 1);
  const progress = await User.updateOne(
    {
      _id: state.userId,
      role: "citizen",
      onboardingCompletedAt: { $exists: false },
    },
    {
      $set: { onboardingDraft: draft, onboardingStep: nextStep },
    },
    { runValidators: true },
  );
  if (progress.matchedCount !== 1)
    throw new Error("Your onboarding progress changed. Please reload.");
  return { ok: true as const, nextStep };
}
