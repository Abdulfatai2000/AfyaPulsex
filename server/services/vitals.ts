// Dev 3 owns this service. Vital reading ingestion and retrieval.
import "server-only";
import { accountRecordFilter, accountIsDemo } from "./account-environment";
import { connectDB } from "@/server/db/connection";
import { VitalReading } from "@/server/models";
import type { QueryFilter } from "mongoose";
import { omitMeta } from "@/server/lib/model-utils";

const MAX_LIST_LIMIT = 100;

export async function recordVitalReading(
  citizenId: string,
  input: Partial<VitalReading>,
): Promise<VitalReading> {
  await connectDB();
  if (await accountIsDemo(citizenId)) throw new Error("Demo accounts are read-only.");
  const { takenAt, ...rest } = omitMeta(input);
  const doc = await VitalReading.create({
    ...rest,
    citizen: citizenId,
    simulation: false,
    takenAt: takenAt ?? new Date(),
  });
  return doc.toObject();
}

export async function listVitalReadings(
  citizenId: string,
  from: Date,
  to: Date,
): Promise<VitalReading[]> {
  await connectDB();
  const query: QueryFilter<VitalReading> = { citizen: citizenId, ...await accountRecordFilter(citizenId) };
  const date: { $gte?: Date; $lte?: Date } = {};
  if (from) date.$gte = from;
  if (to) date.$lte = to;
  if (from || to) query.takenAt = date;
  return VitalReading.find(query)
    .sort({ takenAt: -1 })
    .limit(MAX_LIST_LIMIT)
    .lean();
}
