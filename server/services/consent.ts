import "server-only";
import { ConsentRecord } from "@/server/models";
import { connectDB } from "@/server/db/connection";
import { COMMUNITY_PURPOSE, communityPolicyVersion } from "./privacy-policy";

export async function latestConsent(citizenId: string, purpose: string) {
  await connectDB();
  return ConsentRecord.findOne({ citizen: citizenId, purpose, simulation: { $ne: true }, effectiveAt: { $lte: new Date() } })
    .sort({ effectiveAt: -1, createdAt: -1, _id: -1 }).lean();
}
export async function recordConsent(citizenId: string, purpose: string, version: string): Promise<ConsentRecord> {
  if (purpose !== COMMUNITY_PURPOSE || !communityPolicyVersion() || version !== communityPolicyVersion())
    throw new Error("An approved consent policy version must be configured.");
  await connectDB();
  const record = await ConsentRecord.create({ citizen: citizenId, purpose, version, granted: true, effectiveAt: new Date(), source: "app", simulation: false });
  return record.toObject();
}
export async function revokeConsent(consentId: string): Promise<ConsentRecord> {
  await connectDB();
  const record = await ConsentRecord.findByIdAndUpdate(consentId, { $set: { revokedAt: new Date(), granted: false } }, { new: true }).lean();
  if (!record) throw new Error("Consent record not found.");
  return record;
}
export async function hasActiveConsent(citizenId: string, purpose: string): Promise<boolean> {
  if (purpose !== COMMUNITY_PURPOSE) return false;
  const version = communityPolicyVersion();
  if (!version) return false;
  const record = await latestConsent(citizenId, purpose);
  return !!(record && record.version === version && record.granted && !record.revokedAt && (!record.expiresAt || record.expiresAt > new Date()));
}
