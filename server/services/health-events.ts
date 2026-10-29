// Dev 3 owns this service. Health events (multi-symptom episodes) and queries.
// reportHealthEvent stores the citizen-supplied draft; maxSeverity is derived
// from the symptom entries when not provided explicitly.
import "server-only";
import { accountRecordFilter, accountIsDemo } from "./account-environment";
import { connectDB } from "@/server/db/connection";
import { HealthEvent } from "@/server/models";
import type { QueryFilter } from "mongoose";
import { omitMeta } from "@/server/lib/model-utils";
import { safeLimit } from "@/server/lib/pagination";

export async function reportHealthEvent(
  citizenId: string,
  input: Partial<HealthEvent>,
): Promise<HealthEvent> {
  await connectDB();
  const simulation = await accountIsDemo(citizenId);
  const { symptoms = [], maxSeverity, ...rest } = omitMeta(input);
  const computedMax =
    maxSeverity ??
    (symptoms.length
      ? Math.max(...symptoms.map((s) => s.severity))
      : undefined);
  const doc = await HealthEvent.create({
    ...rest,
    citizen: citizenId,
    simulation,
    symptoms,
    maxSeverity: computedMax,
    status: "reported",
  });
  return doc.toObject();
}

export async function listHealthEvents(
  citizenId: string,
  opts: { from?: Date; to?: Date; limit?: number; dateField?: "reportedAt" | "onsetAt" },
): Promise<HealthEvent[]> {
  await connectDB();
  const limit = safeLimit(opts.limit);
  const query: QueryFilter<HealthEvent> = { citizen: citizenId, ...await accountRecordFilter(citizenId) };
  const date: { $gte?: Date; $lte?: Date } = {};
  if (opts.from) date.$gte = opts.from;
  if (opts.to) date.$lte = opts.to;
  const field = opts.dateField ?? "reportedAt";
  if (opts.from || opts.to) query[field] = date;
  return HealthEvent.find(query).sort({ [field]: -1 }).limit(limit).lean();
}
