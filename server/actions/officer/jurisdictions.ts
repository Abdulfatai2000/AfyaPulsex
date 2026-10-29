// Dev 3 owns this file. Officer jurisdiction boundary — the approved officer's
// assignable geography for filters and scope selectors. Mirrors the portal's
// shared geography contract (slug ids, 36 states + FCT, 774 LGAs).
"use server";
import { requireApprovedOfficer } from "@/server/auth/rbac";
import { REFERENCE_STATES } from "@/lib/services/officer/geography/reference";
import type { AuthorizedGeography } from "@/lib/services/officer/geography";

export async function getJurisdictionsAction(): Promise<AuthorizedGeography> {
  await requireApprovedOfficer();
  return { states: REFERENCE_STATES };
}