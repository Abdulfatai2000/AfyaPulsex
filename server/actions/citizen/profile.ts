// Dev 3 owns this file. Citizen profile boundary — reads/writes for the
// profile section (address shape mirrors the onboarding LocationDraft).
"use server";
import { z } from "zod";
import { requireWritableCitizen, requireCitizen } from "@/server/auth/rbac";
import { User, ConsentRecord } from "@/server/models";
import {
  getHealthProfile,
  updateHealthProfile,
} from "@/server/services/health-profile";
import { docIdString } from "@/server/lib/id-utils";
import {
  personalInformationSchema,
  locationSchema,
} from "@/components/citizen/onboarding/validation";
import {
  healthProfileSettingsSchema,
  type HealthProfileSettings,
} from "@/server/validation/profile";
import type {
  PersonalInformationDraft,
  LocationDraft,
} from "@/types/onboarding";
import {
  getCitizenProfile,
  updateCitizenProfile,
} from "@/server/services/citizen-profile";

export interface CitizenProfileDTO {
  fullName: string;
  email: string;
  dateOfBirth: string | null;
  gender: string;
  phone: string | null;
  address: {
    street: string | null;
    state: string | null;
    district: string | null;
    community: string | null;
    country: string | null;
  };
  bloodType: string;
  emergencyContact: {
    name: string | null;
    relationship: string | null;
    phone: string | null;
  };
}

const updateSchema = z.object({
  dateOfBirth: z.coerce.date().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  gender: z.enum(["male", "female", "non_binary", "undisclosed"]).optional(),
  bloodType: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"])
    .optional(),
  address: z
    .object({
      street: z.string().trim().max(200).nullable().optional(),
      state: z.string().trim().max(100).nullable().optional(),
      district: z.string().trim().max(100).nullable().optional(),
      community: z.string().trim().max(100).nullable().optional(),
      country: z.string().trim().max(10).nullable().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(100).nullable().optional(),
      relationship: z.string().trim().max(50).nullable().optional(),
      phone: z.string().trim().max(30).nullable().optional(),
    })
    .optional(),
});

function toDTO(
  profile: Awaited<ReturnType<typeof getCitizenProfile>>,
  session: { id: string; name?: string | null; email?: string | null },
): CitizenProfileDTO {
  return {
    fullName: session.name ?? "",
    email: session.email ?? "",
    dateOfBirth: profile?.dateOfBirth
      ? profile.dateOfBirth.toISOString()
      : null,
    gender: profile?.gender ?? "undisclosed",
    phone: profile?.phone ?? null,
    address: {
      street: profile?.address?.street ?? null,
      state: profile?.address?.state ?? null,
      district: profile?.address?.district ?? null,
      community: profile?.address?.community ?? null,
      country: profile?.address?.country ?? null,
    },
    bloodType: profile?.bloodType ?? "unknown",
    emergencyContact: {
      name: profile?.emergencyContact?.name ?? null,
      relationship: profile?.emergencyContact?.relationship ?? null,
      phone: profile?.emergencyContact?.phone ?? null,
    },
  };
}

export async function getProfileAction(): Promise<CitizenProfileDTO> {
  const session = await requireCitizen();
  const userId = session.user?.id;
  if (!userId) throw new Error("Authenticated citizen required");

  const profile = await getCitizenProfile(userId);
  const user = await User.findById(userId).select("name email").lean();
  if (!user) throw new Error("Account not found.");
  return toDTO(profile, { id: userId, name: user.name, email: user.email });
}

export async function updateProfileAction(
  input: z.input<typeof updateSchema>,
): Promise<CitizenProfileDTO> {
  const session = await requireWritableCitizen();
  const userId = session.user?.id;
  if (!userId) throw new Error("Authenticated citizen required");

  const patch = updateSchema.parse(input);
  const address = patch.address
    ? {
        country: patch.address.country ?? "NG",
        street: patch.address.street ?? undefined,
        state: patch.address.state ?? undefined,
        district: patch.address.district ?? undefined,
        community: patch.address.community ?? undefined,
      }
    : undefined;
  await updateCitizenProfile(userId, { ...patch, address });

  return getProfileAction();
}

export async function updatePersonalInformationAction(
  input: PersonalInformationDraft,
) {
  const session = await requireWritableCitizen();
  const personal = personalInformationSchema.parse(input);
  await updateCitizenProfile(session.user.id, {
    dateOfBirth: new Date(personal.dateOfBirth),
    gender: personal.gender || "undisclosed",
  });
  const result = await User.updateOne(
    { _id: session.user.id, role: "citizen" },
    { $set: { name: personal.fullName } },
    { runValidators: true },
  );
  if (result.matchedCount !== 1) throw new Error("Account not found.");
  return getProfileAction();
}

export async function updateLocationAction(input: LocationDraft) {
  const session = await requireWritableCitizen();
  const address = locationSchema.parse(input);
  const current = await getCitizenProfile(session.user.id);
  // Only the current profile changes. Historical event/vital locations stay intact.
  await updateCitizenProfile(session.user.id, {
    address: { ...current?.address, ...address },
  });
  return getProfileAction();
}

export async function getHealthProfileAction(): Promise<HealthProfileSettings> {
  const session = await requireCitizen();
  const profile = await getCitizenProfile(session.user.id);
  const health = profile ? await getHealthProfile(docIdString(profile)) : null;
  return {
    bloodGroup: health?.bloodType ?? profile?.bloodType ?? "unknown",
    allergies: health?.allergies ?? [],
    conditions: health?.chronicConditions ?? [],
    medications: (health?.medications ?? []).map((med) => ({
      name: med.name ?? "",
      dosage: med.dosage ?? "",
      frequency: med.frequency ?? "",
    })),
  };
}

export async function updateHealthProfileAction(input: HealthProfileSettings) {
  const session = await requireWritableCitizen();
  const health = healthProfileSettingsSchema.parse(input);
  const profile = await updateCitizenProfile(session.user.id, {
    bloodType: health.bloodGroup || "unknown",
  });
  await updateHealthProfile(docIdString(profile), {
    bloodType: health.bloodGroup || "unknown",
    allergies: health.allergies,
    chronicConditions: health.conditions,
    medications: health.medications as NonNullable<
      Awaited<ReturnType<typeof getHealthProfile>>
    >["medications"],
  });
  return getHealthProfileAction();
}

export async function getProfileConsentAction() {
  const session = await requireCitizen();
  // Connect through the existing profile service, then read the authoritative ledger.
  await getCitizenProfile(session.user.id);
  const record = await ConsentRecord.findOne({
    citizen: session.user.id,
    purpose: "community_insights",
    simulation: session.user.isDemo ? true : { $ne: true },
    effectiveAt: { $lte: new Date() },
  })
    .sort({ effectiveAt: -1, createdAt: -1, _id: -1 })
    .lean();
  // TODO(DEV4): enable writes through recordConsent/revokeConsent once those
  // service stubs and the approved policy version are implemented. Never use
  // onboardingDraft or a browser toggle as an authoritative consent grant.
  return {
    granted: !!(
      record?.granted &&
      !record.revokedAt &&
      (!record.expiresAt || record.expiresAt > new Date())
    ),
    version: record?.version ?? null,
    recordedAt: record?.effectiveAt.toISOString() ?? null,
    canUpdate: false as const,
  };
}

export async function getProfileSettingsAction() {
  const [profile, health, consent] = await Promise.all([
    getProfileAction(),
    getHealthProfileAction(),
    getProfileConsentAction(),
  ]);
  return { profile, health, consent };
}
export type ProfileSettingsData = Awaited<
  ReturnType<typeof getProfileSettingsAction>
>;
