// Dev 3 owns this service. Aggregate exploration of health data for approved
// officers within their jurisdiction.
// MUST run after requireApprovedOfficer + requireJurisdictionAccess (Dev 4).
import "server-only";
import { connectDB } from "@/server/db/connection";
import { AggregatedSignal, HealthEvent } from "@/server/models";
import type { QueryFilter } from "mongoose";
import { safeLimit, safeOffset } from "@/server/lib/pagination";

export async function exploreHealthEvents(
  jurisdictionId: string,
  opts: { from?: Date; to?: Date; page?: number; limit?: number },
): Promise<{ events: HealthEvent[]; total: number }> {
  await connectDB();
  const limit = safeLimit(opts.limit);
  const offset = safeOffset(opts.page, limit);
  const query: QueryFilter<HealthEvent> = { jurisdiction: jurisdictionId, simulation: { $ne: true } };
  const date: { $gte?: Date; $lte?: Date } = {};
  if (opts.from) date.$gte = opts.from;
  if (opts.to) date.$lte = opts.to;
  if (opts.from || opts.to) query.reportedAt = date;
  const [events, total] = await Promise.all([
    HealthEvent.find(query)
      .sort({ reportedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    HealthEvent.countDocuments(query),
  ]);
  return { events, total };
}

export async function exploreSignals(
  jurisdictionId: string,
  opts: { from?: Date; to?: Date; page?: number; limit?: number },
): Promise<{ signals: AggregatedSignal[]; total: number }> {
  await connectDB();
  const limit = safeLimit(opts.limit);
  const offset = safeOffset(opts.page, limit);
  const query: QueryFilter<AggregatedSignal> = { jurisdiction: jurisdictionId, simulation: { $ne: true } };
  if (opts.from) query.periodEnd = { $gte: opts.from };
  if (opts.to) query.periodStart = { $lte: opts.to };
  const [signals, total] = await Promise.all([
    AggregatedSignal.find(query)
      .sort({ periodEnd: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    AggregatedSignal.countDocuments(query),
  ]);
  return { signals, total };
}
