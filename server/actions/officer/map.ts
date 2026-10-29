"use server";

import { requireLiveOfficer } from "@/server/auth/rbac";
import { z } from "zod";
import { Jurisdiction } from "@/server/models";
import { listSignals } from "@/server/services/signals";
import { getOfficerMapContext } from "@/server/services/officer-map-scope";
import {
  resolveJurisdiction,
  referenceLocation,
} from "@/server/services/jurisdiction-resolution";
import {
  minimumAggregateGroup,
  communityPolicyVersion,
} from "@/server/services/privacy-policy";
import { mapSelection, validMapPoint } from "@/lib/services/officer/map-scope";
import type { MapFilters, MapZone } from "@/lib/services/officer/map";

const schema = z.object({
  stateId: z.string().max(100),
  lgaId: z.string().max(100),
  symptom: z.string().max(100),
  healthCondition: z.string().max(100),
  ageGroup: z.enum(["all", "0-14", "15-29", "30-44", "45-59", "60+"]),
  sex: z.enum(["all", "male", "female", "other"]),
  timeRange: z.enum(["7d", "14d", "30d"]),
  severity: z.enum(["all", "high", "moderate", "low"]),
  reportType: z.enum(["all", "case", "outbreak", "surveillance"]),
});

export async function getOfficerMapDataAction(
  input: MapFilters,
): Promise<MapZone[]> {
  await requireLiveOfficer();
  const { session, root, scope } = await getOfficerMapContext();
  const filters = schema.parse(input);
  const { state, lga } = mapSelection(scope, filters);
  // Public reference IDs resolve into the existing database hierarchy. The
  // authoritative descendant list is checked independently of the dropdowns.
  const selection = state ? await resolveJurisdiction(state.id, lga?.id) : null;
  if (
    selection &&
    !session.jurisdictionIds.includes(String(selection.jurisdiction._id))
  )
    throw new Error("Selection is outside your authorized jurisdiction.");
  if (state && !selection) return [];
  if (!minimumAggregateGroup() || !communityPolicyVersion()) return [];
  // AggregatedSignal has no demographic/disease strata. Never substitute an
  // unfiltered count or query raw events to satisfy unsupported dimensions.
  if (
    filters.symptom ||
    filters.healthCondition ||
    filters.ageGroup !== "all" ||
    filters.sex !== "all" ||
    filters.reportType !== "all"
  )
    return [];

  const target = selection?.jurisdiction ?? root;
  const targets =
    target.level === "lga"
      ? [target]
      : await Jurisdiction.find({
          parent: target._id,
          level: target.level === "country" ? "state" : "lga",
          _id: { $in: session.jurisdictionIds },
        }).lean();
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  const from = new Date(
    +to - Number(filters.timeRange.slice(0, -1)) * 86400000,
  );

  const zonePromises = targets.map(async (area) => {
    if (!session.jurisdictionIds.includes(String(area._id))) return null;
    // Reuse AggregatedSignal reads and current consent/threshold revalidation.
    // Exact fixed windows avoid summing overlapping persisted snapshots.
    const signals = await listSignals(String(area._id), from, to);
    const signal = signals.find(
      (row) => +row.periodStart === +from && +row.periodEnd === +to,
    );
    if (!signal) return null;
    let coordinates = area.centroid?.coordinates;
    if (
      !coordinates ||
      coordinates.length !== 2 ||
      !validMapPoint(coordinates[1], coordinates[0])
    ) {
      try {
        const parent =
          area.level === "lga" && area.parent
            ? await Jurisdiction.findById(area.parent).select("name").lean()
            : null;
        const reference = referenceLocation(
          area.level === "state" ? area.name : (parent?.name ?? ""),
          area.level === "lga" ? area.name : undefined,
        );
        const point = reference.lga ?? reference.state;
        coordinates = [point.lng, point.lat];
      } catch {
        console.warn(
          "[Officer map] Aggregate zone omitted: administrative centroid unavailable.",
        );
        return null;
      }
    }
    // Existing legend buckets describe reporting volume, not disease severity.
    const activityLevel =
      signal.count >= 20 ? "high" : signal.count >= 5 ? "moderate" : "low";
    if (filters.severity !== "all" && activityLevel !== filters.severity)
      return null;
    return {
      zoneId: `zone-${area._id}`,
      name: area.name,
      lat: coordinates[1],
      lng: coordinates[0],
      radius: area.level === "state" ? 25 : 5,
      activityLevel,
      reportCount: signal.count,
      topSymptom: null,
      suppressed: false,
    } as MapZone;
  });

  const resolved = await Promise.all(zonePromises);
  return resolved.filter((zone): zone is MapZone => zone !== null);
}
