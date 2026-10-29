// Dev 3 owns this service. Health profile read/write operations.
// Optional clinical background keyed off the CitizenProfile record.
import "server-only";
import { accountRecordFilter, accountIsDemo } from "./account-environment";
import { connectDB } from "@/server/db/connection";
import { HealthProfile, CitizenProfile } from "@/server/models";
import { omitMeta } from "@/server/lib/model-utils";

export async function getHealthProfile(
  citizenProfileId: string,
): Promise<HealthProfile | null> {
  await connectDB();
  const profile = await CitizenProfile.findById(citizenProfileId).select("user").lean();
  if (!profile) return null;
  return HealthProfile.findOne({ citizenProfile: citizenProfileId, ...await accountRecordFilter(String(profile.user)) }).lean();
}

export async function updateHealthProfile(
  citizenProfileId: string,
  patch: Partial<HealthProfile>,
): Promise<HealthProfile> {
  await connectDB();
  const profile = await CitizenProfile.findById(citizenProfileId).select("user").lean();
  if (!profile || await accountIsDemo(String(profile.user))) throw new Error("Demo accounts are read-only.");
  const doc = await HealthProfile.findOneAndUpdate(
    { citizenProfile: citizenProfileId },
    { $set: omitMeta(patch) },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  if (!doc) throw new Error("Failed to create/update health profile");
  return doc;
}
