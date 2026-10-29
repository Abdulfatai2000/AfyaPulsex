import "server-only";
import { cache } from "react";
import { connectDB } from "@/server/db/connection";
import {
  HealthEvent,
  AggregatedSignal,
  ConsentRecord,
  Jurisdiction,
} from "@/server/models";
import {
  communityPolicyVersion,
  minimumAggregateGroup,
} from "./privacy-policy";
import { Types } from "mongoose";

/** Re-evaluate current authoritative consent, including later refusals/revocations. */
const eligibleCitizens = cache(async () => {
  const version = communityPolicyVersion();
  if (!version) return [];
  const now = new Date();
  const rows = await ConsentRecord.aggregate<{ _id: Types.ObjectId }>([
    {
      $match: {
        purpose: "communityContribution",
        simulation: { $ne: true },
        effectiveAt: { $lte: now },
      },
    },
    { $sort: { effectiveAt: -1, createdAt: -1, _id: -1 } },
    { $group: { _id: "$citizen", latest: { $first: "$$ROOT" } } },
    {
      $match: {
        "latest.version": version,
        "latest.granted": true,
        "latest.revokedAt": null,
        $or: [
          { "latest.expiresAt": null },
          { "latest.expiresAt": { $gt: now } },
        ],
      },
    },
    { $project: { _id: 1 } },
  ]);
  return rows.map((row) => row._id);
});

/** Counts only; no raw histories, free text, locations or identity leave MongoDB. */
export async function aggregateWindow(
  jurisdictionId: string,
  from: Date,
  to: Date,
) {
  const threshold = minimumAggregateGroup();
  if (!threshold || !communityPolicyVersion()) return null;
  await connectDB();
  const citizens = await eligibleCitizens();
  // State buckets include descendants; HealthEvent jurisdiction is its reporting-time snapshot.
  const scope = [new Types.ObjectId(jurisdictionId)];
  let frontier = [...scope];
  while (frontier.length) {
    const children = await Jurisdiction.find({
      parent: { $in: frontier },
      _id: { $nin: scope },
    })
      .select("_id")
      .lean();
    frontier = children.map((child) => child._id);
    scope.push(...frontier);
  }
  const rows = await HealthEvent.aggregate<{ reports: number; people: number }>(
    [
      {
        $match: {
          citizen: { $in: citizens },
          jurisdiction: { $in: scope },
          simulation: { $ne: true },
          reportedAt: { $gte: from, $lt: to },
        },
      },
      { $group: { _id: "$citizen", reports: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          reports: { $sum: "$reports" },
          people: { $sum: 1 },
        },
      },
      { $project: { _id: 0, reports: 1, people: 1 } },
    ],
  );
  return rows[0] && rows[0].people >= threshold ? rows[0] : null;
}

/** Compare equal adjacent windows. An increase is a review signal, not an outbreak. */
export async function currentPattern(
  jurisdictionId: string,
  from: Date,
  to: Date,
) {
  if (
    !Number.isFinite(+from) ||
    !Number.isFinite(+to) ||
    to <= from ||
    +to - +from > 31 * 86400000
  )
    return null;
  const [current, baseline] = await Promise.all([
    aggregateWindow(jurisdictionId, from, to),
    aggregateWindow(jurisdictionId, new Date(+from - (+to - +from)), from),
  ]);
  if (!current || !baseline || current.reports <= baseline.reports) return null;
  return { current, baseline };
}

export async function computeSignals(
  jurisdictionIds: string[],
  period: { from: Date; to: Date },
) {
  if (!minimumAggregateGroup() || !communityPolicyVersion()) return [];
  await connectDB();
  const results = [];
  for (const jurisdictionId of jurisdictionIds) {
    const area = await Jurisdiction.findById(jurisdictionId)
      .select("level")
      .lean();
    if (!area || !["state", "lga"].includes(area.level)) continue;
    const pattern = await currentPattern(
      jurisdictionId,
      period.from,
      period.to,
    );
    if (!pattern) continue;
    const signal = await AggregatedSignal.findOneAndUpdate(
      {
        jurisdiction: jurisdictionId,
        metric: "symptom_volume",
        simulation: { $ne: true },
        periodStart: period.from,
        periodEnd: period.to,
      },
      {
        $set: {
          count: pattern.current.reports,
          sourceCount: pattern.current.people,
          threshold: pattern.baseline.reports,
          normalizedScore:
            (pattern.current.reports - pattern.baseline.reports) /
            pattern.baseline.reports,
          isAnomaly: true,
          computedAt: new Date(),
          simulation: false,
          metadata: {
            detector: "adjacent-window-increase-v1",
            baselineCount: pattern.baseline.reports,
          },
        },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();
    if (signal) results.push(signal);
  }
  return results;
}

export async function listSignals(
  jurisdictionId: string,
  from: Date,
  to: Date,
) {
  if (!minimumAggregateGroup() || !communityPolicyVersion()) return [];
  await connectDB();
  const signals = await AggregatedSignal.find({
    jurisdiction: jurisdictionId,
    metric: "symptom_volume",
    simulation: { $ne: true },
    periodStart: { $gte: from },
    periodEnd: { $lte: to },
  })
    .sort({ periodStart: -1 })
    .lean();
  const safe = [];
  for (const signal of signals) {
    const pattern = await currentPattern(
      jurisdictionId,
      signal.periodStart,
      signal.periodEnd,
    );
    if (pattern)
      safe.push({
        ...signal,
        count: pattern.current.reports,
        sourceCount: pattern.current.people,
        threshold: pattern.baseline.reports,
        metadata: undefined,
      });
  }
  return safe;
}
