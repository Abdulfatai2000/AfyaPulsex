"use server";
import { requireCapability } from "@/server/auth/rbac";
import { computeSignals, listSignals } from "@/server/services/signals";
import { evaluateSignals } from "@/server/services/warnings";
import { AggregatedSignal, EarlyWarning } from "@/server/models";
import { connectDB } from "@/server/db/connection";
import {
  patternForWarning,
  AlertPipelineError,
} from "@/server/services/ai-insights";
import {
  minimumAggregateGroup,
  communityPolicyVersion,
  INSUFFICIENT_AGGREGATED_DATA,
} from "@/server/services/privacy-policy";
import type {
  EarlyWarning as WarningDTO,
  WarningFilters,
} from "@/lib/services/officer/warnings";
import { z } from "zod";

const daysSchema = z.union([z.literal(7), z.literal(14), z.literal(30)]);
function period(days: number) {
  // Fixed day boundaries make repeated requests idempotent and avoid narrow differencing windows.
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  return { from: new Date(+to - days * 86400000), to };
}
export async function computeSignalsAction(periodDays: 7 | 14 | 30 = 7) {
  const session = await requireCapability("signals:read");
  const signals = await computeSignals(
    session.jurisdictionIds,
    period(daysSchema.parse(periodDays)),
  );
  return signals.map((signal) => ({ id: String(signal._id) }));
}
export async function listSignalsAction(periodDays: 7 | 14 | 30 = 7) {
  const session = await requireCapability("signals:read");
  const { from, to } = period(daysSchema.parse(periodDays));
  const rows = await Promise.all(
    session.jurisdictionIds.map((id) => listSignals(id, from, to)),
  );
  return rows.flat().map((signal) => ({
    id: String(signal._id),
    metric: signal.metric,
    count: signal.count,
    periodStart: signal.periodStart.toISOString(),
    periodEnd: signal.periodEnd.toISOString(),
  }));
}
export async function evaluateSignalsAction(signalIds: string[]) {
  const session = await requireCapability("warnings:read");
  z.array(z.string().regex(/^[a-f\d]{24}$/i))
    .max(200)
    .parse(signalIds);
  await connectDB();
  const allowed = await AggregatedSignal.find({
    _id: { $in: signalIds },
    jurisdiction: { $in: session.jurisdictionIds },
  })
    .select("_id")
    .lean();
  const warnings = await evaluateSignals(allowed.map((row) => String(row._id)));
  return warnings.map((warning) => ({ id: String(warning._id) }));
}

export async function getActiveWarningsAction(
  filters?: Partial<WarningFilters>,
  id?: string,
): Promise<WarningDTO[]> {
  const session = await requireCapability("warnings:read");
  if (!minimumAggregateGroup() || !communityPolicyVersion())
    throw new Error(INSUFFICIENT_AGGREGATED_DATA);
  const days =
    filters?.timeRange === "14d" ? 14 : filters?.timeRange === "30d" ? 30 : 7;
  await connectDB();
  if (id)
    z.string()
      .regex(/^[a-f\d]{24}$/i)
      .parse(id);
  // Refresh the existing detection pipeline from the real HealthEvent source.
  if (!id) {
    const signals = await computeSignals(session.jurisdictionIds, period(days));
    await evaluateSignals(signals.map((signal) => String(signal._id)));
  }
  const docs = await EarlyWarning.find({
    jurisdiction: { $in: session.jurisdictionIds },
    simulation: { $ne: true },
    status: { $in: ["draft", "active"] },
    ...(id ? { _id: id } : {}),
  })
    .sort({ issuedAt: -1 })
    .limit(100)
    .lean();
  const result: WarningDTO[] = [];
  for (const doc of docs) {
    try {
      const { payload } = await patternForWarning(
        String(doc._id),
        session.jurisdictionIds,
      );
      const windowDays = Math.round(
        (+new Date(payload.periodEnd) - +new Date(payload.periodStart)) /
          86400000,
      );
      if (![7, 14, 30].includes(windowDays) || (!id && windowDays !== days))
        continue;
      const row: WarningDTO = {
        id: String(doc._id),
        title: `Increase in health reports - ${payload.lga ?? payload.state}`,
        signal: payload.trendSummary,
        state: payload.state,
        lga: payload.lga ?? "Entire state",
        ward: null,
        healthCondition: "Health reporting activity",
        timeWindow: `${payload.periodStart.slice(0, 10)} to ${payload.periodEnd.slice(0, 10)}`,
        windowDays: windowDays as 7 | 14 | 30,
        status: "requires-review",
        severity: "low",
        elevatedEstimate: Math.round(
          ((payload.reportCount - payload.baselineCount) /
            payload.baselineCount) *
            100,
        ),
        signalCount: payload.reportCount,
        lastUpdated: doc.updatedAt.toISOString(),
        dataSufficiency: "sufficient",
      };
      if (
        filters?.state &&
        filters.state.replace(/ State$/i, "").toLowerCase() !==
          row.state.replace(/ State$/i, "").toLowerCase()
      )
        continue;
      if (filters?.lga && filters.lga !== row.lga) continue;
      if (
        filters?.status &&
        filters.status !== "all" &&
        filters.status !== row.status
      )
        continue;
      if (
        filters?.severity &&
        filters.severity !== "all" &&
        filters.severity !== row.severity
      )
        continue;
      if (
        filters?.healthCondition &&
        filters.healthCondition !== row.healthCondition
      )
        continue;
      if (
        filters?.search &&
        !row.title.toLowerCase().includes(filters.search.toLowerCase())
      )
        continue;
      result.push(row);
    } catch (error) {
      if (!(error instanceof AlertPipelineError)) throw error;
      // Revoked consent or insufficient current/baseline data suppresses the stored warning.
    }
  }
  return result;
}
