import type { GeographyState } from "./geography";
import type { MapFilters } from "./map";

export interface MapViewport {
  center: [number, number];
  bounds: [[number, number], [number, number]] | null;
  zoom: number;
  /** Reference centroids are not administrative boundary polygons. */
  exactBoundary: boolean;
}

export interface OfficerMapScope {
  level: "country" | "state" | "lga";
  label: string;
  stateId: string;
  lgaId: string;
  states: readonly GeographyState[];
  viewport: MapViewport;
}

export function validMapPoint(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** Only existing administrative centroids; never Citizen coordinates or invented offsets. */
export function centroidViewport(
  points: readonly { lat: number; lng: number }[],
  zoom: number,
): MapViewport {
  const valid = points.filter((point) => validMapPoint(point.lat, point.lng));
  if (!valid.length) throw new Error("No reference map coordinates available.");
  const south = Math.min(...valid.map((point) => point.lat));
  const north = Math.max(...valid.map((point) => point.lat));
  const west = Math.min(...valid.map((point) => point.lng));
  const east = Math.max(...valid.map((point) => point.lng));
  return {
    center: [valid[0].lat, valid[0].lng],
    bounds:
      south < north && west < east
        ? [
            [south, west],
            [north, east],
          ]
        : null,
    zoom,
    exactBoundary: false,
  };
}

/** UX validation mirrored by the server; browser values never grant jurisdiction. */
export function mapSelection(
  scope: OfficerMapScope,
  filters: Pick<MapFilters, "stateId" | "lgaId">,
) {
  const stateId = filters.stateId || scope.stateId;
  const lgaId = filters.lgaId || scope.lgaId;
  if (scope.level !== "country" && stateId !== scope.stateId)
    throw new Error("State is outside your authorized jurisdiction.");
  if (scope.level === "lga" && lgaId !== scope.lgaId)
    throw new Error("LGA is outside your authorized jurisdiction.");
  const state = scope.states.find((item) => item.id === stateId);
  if (stateId && !state)
    throw new Error("State is outside your authorized jurisdiction.");
  const lga = state?.lgas.find((item) => item.id === lgaId);
  if (lgaId && !lga)
    throw new Error("LGA is outside your authorized jurisdiction.");
  return { state, lga };
}
