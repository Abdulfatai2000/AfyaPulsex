// Dev 3 owns this service. Symptom reporting and lookup.
// Citizen symptom catalog lives separately from HealthEvent episodes.
import "server-only";
import { connectDB } from "@/server/db/connection";
import { Symptom } from "@/server/models";
import type { QueryFilter } from "mongoose";
import { omitMeta } from "@/server/lib/model-utils";

const MAX_LIST_LIMIT = 100;

export async function createSymptom(
  citizenId: string,
  input: Omit<Symptom, "citizen">,
): Promise<Symptom> {
  await connectDB();
  const doc = await Symptom.create({ citizen: citizenId, ...omitMeta(input) });
  return doc.toObject();
}

export async function listSymptoms(
  citizenId: string,
  from: Date,
  to: Date,
): Promise<Symptom[]> {
  await connectDB();
  const query: QueryFilter<Symptom> = { citizen: citizenId };
  if (from || to) query.createdAt = { $gte: from, $lte: to };
  return Symptom.find(query)
    .sort({ createdAt: -1 })
    .limit(MAX_LIST_LIMIT)
    .lean();
}
