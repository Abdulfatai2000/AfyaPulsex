import "server-only";
import { cache } from "react";
import { requireCapability } from "@/server/auth/rbac";
import { Jurisdiction, OfficerProfile } from "@/server/models";
import { REFERENCE_STATES } from "@/lib/services/officer/geography/reference";
import { referenceLocation } from "./jurisdiction-resolution";
import {
  centroidViewport,
  validMapPoint,
  type OfficerMapScope,
} from "@/lib/services/officer/map-scope";

/** Resolve geography from the authenticated profile, not URL parameters or client role flags. */
export const getOfficerMapContext = cache(async () => {
  const session = await requireCapability("signals:read", { allowDemo: true });
  const profile = await OfficerProfile.findById(session.officerProfileId)
    .select("jurisdiction")
    .lean();
  const root = profile?.jurisdiction
    ? await Jurisdiction.findById(profile.jurisdiction).lean()
    : null;
  if (
    !root ||
    !session.jurisdictionIds.includes(String(root._id)) ||
    !["country", "state", "lga"].includes(root.level)
  )
    throw new Error("Map jurisdiction is not authorized.");
  const level = root.level as OfficerMapScope["level"];
  if (level === "country" && root.code !== "NG")
    throw new Error("Map jurisdiction is not supported.");
  const parent =
    level === "lga" && root.parent
      ? await Jurisdiction.findById(root.parent).lean()
      : null;
  let reference: ReturnType<typeof referenceLocation> | null = null;
  if (level !== "country") {
    try {
      reference = referenceLocation(
        level === "state" ? root.name : (parent?.name ?? ""),
        level === "lga" ? root.name : undefined,
      );
    } catch {
      console.warn(
        "[Officer map] Assigned jurisdiction has no matching reference geography.",
      );
    }
  }
  const states =
    level === "country"
      ? REFERENCE_STATES
      : reference
        ? [
            {
              ...reference.state,
              lgas: reference.lga ? [reference.lga] : reference.state.lgas,
            },
          ]
        : [];
  const coordinates = root.centroid?.coordinates;
  const stored =
    coordinates?.length === 2 && validMapPoint(coordinates[1], coordinates[0])
      ? [{ lat: coordinates[1], lng: coordinates[0] }]
      : [];
  const points =
    level === "country"
      ? REFERENCE_STATES.flatMap((state) => state.lgas)
      : reference?.lga
        ? [reference.lga]
        : reference
          ? [reference.state, ...reference.state.lgas]
          : stored;
  // The existing model/reference dataset has centroids, but no administrative bounds.
  // A national context is the last resort for missing coordinates, never a wider data grant.
  const viewport = centroidViewport(
    points.length ? points : REFERENCE_STATES,
    level === "lga" ? 12 : level === "state" ? 8 : 6,
  );
  console.warn(
    "[Officer map] Administrative boundary data unavailable; using a fixed reference-centroid viewport.",
  );
  const scope: OfficerMapScope = {
    level,
    label: root.name,
    states,
    viewport,
    stateId: reference?.state.id ?? "",
    lgaId: reference?.lga?.id ?? "",
  };
  return { session, root, scope };
});
