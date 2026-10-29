// Dev 3 owns this service. Citizen profile read/write operations.
// Runs after the Auth.js session guard (Dev 4). Uses findOneAndUpdate with
// upsert so first-time profile setup works; Mongoose runValidators enforces enums.
import "server-only";
import { accountRecordFilter, accountIsDemo } from "./account-environment";
import { connectDB } from "@/server/db/connection";
import { CitizenProfile } from "@/server/models";
import { resolveJurisdiction } from "./jurisdiction-resolution";
import { omitMeta } from "@/server/lib/model-utils";

export async function getCitizenProfile(
  userId: string,
): Promise<CitizenProfile | null> {
  await connectDB();
  return CitizenProfile.findOne({ user: userId, ...await accountRecordFilter(userId) }).lean();
}

export async function updateCitizenProfile(
  userId: string,
  patch: Partial<CitizenProfile>,
): Promise<CitizenProfile> {
  await connectDB();
  if (await accountIsDemo(userId)) throw new Error("Demo accounts are read-only.");
  if (patch.address) {
    const { country, state, district } = patch.address;
    const supported = ["ng", "nigeria"].includes((country ?? "").toLowerCase());
    const resolved = supported && state && district ? await resolveJurisdiction(state, district, true) : null;
    patch = { ...patch, jurisdiction: resolved?.jurisdiction._id ?? null };
    if (resolved) {
      patch.address = {
        ...patch.address,
        country: resolved.reference.state.code === "NG" ? "NG" : "NG",
        state: resolved.reference.state.name,
        district: resolved.reference.lga!.name,
      };
    }
  }
  const doc = await CitizenProfile.findOneAndUpdate(
    { user: userId },
    { $set: omitMeta(patch) },
    { new: true, upsert: true, runValidators: true },
  ).lean();
  if (!doc) throw new Error("Failed to create/update citizen profile");
  return doc;
}
