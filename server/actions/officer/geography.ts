// Dev 3 owns this file. Officer geography boundary — the authorized State/LGA
// reference set. In dev this mirrors the full reference list; Dev 4's session
// layer scopes it to the officer's assigned jurisdictions.
"use server";
import { requireApprovedOfficer } from "@/server/auth/rbac";
import { REFERENCE_STATES } from "@/lib/services/officer/geography/reference";
import type {
  AuthorizedGeography,
  GeographyState,
} from "@/lib/services/officer/geography";

export async function getAuthorizedGeographyAction(): Promise<AuthorizedGeography> {
  await requireApprovedOfficer();
  const states: GeographyState[] = REFERENCE_STATES.map((state) => state);
  return { states };
}