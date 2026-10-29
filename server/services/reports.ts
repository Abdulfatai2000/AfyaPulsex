// Dev 3 owns this service. Ad-hoc reporting and export.
// Aggregates HealthEvents + AggregatedSignals across the officer's jurisdictions.
import "server-only";
import { connectDB } from "@/server/db/connection";
import { AggregatedSignal, HealthEvent } from "@/server/models";
import type { QueryFilter } from "mongoose";

export async function runReport(opts: {
  jurisdictionIds: string[];
  from: Date;
  to: Date;
}): Promise<{
  events: HealthEvent[];
  signals: AggregatedSignal[];
  summary: Record<string, number>;
}> {
  await connectDB();
  const eventQuery: QueryFilter<HealthEvent> = {
    jurisdiction: { $in: opts.jurisdictionIds },
    simulation: { $ne: true },
    reportedAt: { $gte: opts.from, $lte: opts.to },
  };
  const signalQuery: QueryFilter<AggregatedSignal> = {
    jurisdiction: { $in: opts.jurisdictionIds },
    simulation: { $ne: true },
    periodStart: { $lte: opts.to },
    periodEnd: { $gte: opts.from },
  };
  const [events, signals] = await Promise.all([
    HealthEvent.find(eventQuery).sort({ reportedAt: -1 }).lean(),
    AggregatedSignal.find(signalQuery).sort({ periodEnd: -1 }).lean(),
  ]);
  return {
    events,
    signals,
    summary: {
      events: events.length,
      symptoms: events.reduce((n, e) => n + (e.symptoms?.length ?? 0), 0),
      signals: signals.length,
      anomalies: signals.filter((s) => s.isAnomaly).length,
    },
  };
}
