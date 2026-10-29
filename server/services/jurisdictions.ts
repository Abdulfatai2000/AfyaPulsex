// Dev 3 owns this service. Jurisdiction hierarchy lookups (country->state->lga->ward->facility).
import "server-only";
import { connectDB } from "@/server/db/connection";
import { Jurisdiction } from "@/server/models";

export async function getJurisdiction(
  id: string,
): Promise<Jurisdiction | null> {
  await connectDB();
  return Jurisdiction.findById(id).lean();
}

export async function getJurisdictionByCode(
  code: string,
): Promise<Jurisdiction | null> {
  await connectDB();
  return Jurisdiction.findOne({ code: code.toUpperCase() }).lean();
}

export async function listChildren(parentId: string): Promise<Jurisdiction[]> {
  await connectDB();
  return Jurisdiction.find({ parent: parentId }).sort({ name: 1 }).lean();
}
