import { z } from "zod";
import { mapSelection, type OfficerMapScope } from "./map-scope";
import type { MapFilters, MapZone } from "./map";

export const demoMapFiltersSchema = z.object({
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

/** Synthetic aggregates only. No database reads, Citizen records or privacy-policy defaults. */
export function buildDemoMapZones(
  input: MapFilters,
  scope: OfficerMapScope,
): MapZone[] {
  const filters = demoMapFiltersSchema.parse(input);
  const { state, lga } = mapSelection(scope, filters);
  const areas = lga ? [lga] : state ? state.lgas : scope.states;
  // A single LGA has only one known administrative centroid. Concentric sample
  // cohorts demonstrate all colors without inventing ward/home coordinates.
  const samples =
    areas.length === 1
      ? Array.from({ length: 4 }, (_, index) => ({ area: areas[0], index }))
      : areas.map((area, index) => ({ area, index }));
  const symptoms = ["Fever", "Cough", "Diarrhea", null];
  return samples.flatMap(({ area, index }) => {
    const category = index % 4;
    const period =
      filters.timeRange === "7d" ? 0 : filters.timeRange === "14d" ? 1 : 2;
    const count = [
      28 + period * 9 + (index % 7),
      8 + period * 3 + (index % 3),
      1 + ((index + period) % 4),
      0,
    ][category];
    const activityLevel = (["high", "moderate", "low", "none"] as const)[
      category
    ];
    const symptom = symptoms[category];
    if (filters.severity !== "all" && filters.severity !== activityLevel)
      return [];
    if (
      filters.symptom &&
      !symptom?.toLowerCase().includes(filters.symptom.toLowerCase())
    )
      return [];
    if (
      filters.healthCondition &&
      !`${symptom ?? ""} symptom reports`
        .toLowerCase()
        .includes(filters.healthCondition.toLowerCase())
    )
      return [];
    // Illustrative cohorts, never inferred demographics of real people.
    if (
      filters.ageGroup !== "all" &&
      filters.ageGroup !== ["15-29", "30-44", "0-14", "60+"][category]
    )
      return [];
    if (
      filters.sex !== "all" &&
      filters.sex !== ["female", "male", "other", "female"][category]
    )
      return [];
    if (
      filters.reportType !== "all" &&
      filters.reportType !==
        ["surveillance", "case", "surveillance", "outbreak"][category]
    )
      return [];
    return [
      {
        zoneId: `demo-${area.id}-${category}`,
        name: `${area.name} — Demo ${symptom ? `${symptom.toLowerCase()} reports` : "insufficient-data example"}`,
        lat: area.lat,
        lng: area.lng,
        radius:
          areas.length === 1 ? [2.4, 1.7, 1, 0.35][category] : state ? 4 : 24,
        activityLevel,
        reportCount: count,
        topSymptom: symptom,
        suppressed: category === 3,
        source: "demo" as const,
      },
    ];
  });
}
