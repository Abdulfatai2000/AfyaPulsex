// Dev 3 owns this file. Officer profile boundary — derived from the
// authenticated session plus the OfficerProfile record.
"use server";
import { requireApprovedOfficer } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { OfficerProfile } from "@/server/models";
import { getJurisdiction } from "@/server/services/jurisdictions";
import type { OfficerProfile as OfficerProfileDTO } from "@/lib/services/officer/profile";

export async function getOfficerProfileAction(): Promise<OfficerProfileDTO> {
  const session = await requireApprovedOfficer();

  const officerName = session.user.name?.trim() || "Officer";
  const roleLabel =
    session.user.role === "officer"
      ? "Health Officer"
      : (session.user.role ?? "Health Officer");

  await connectDB();
  const record = await OfficerProfile.findById(session.officerProfileId).lean();

  let jurisdiction: string | undefined;
  if (record?.jurisdiction) {
    const doc = await getJurisdiction(record.jurisdiction.toString());
    jurisdiction = doc?.name;
  }

  const role = record?.title?.trim() || roleLabel;

  return {
    name: officerName,
    role,
    email: session.user.email ?? undefined,
    active: true,
    organization: record?.organizationName ?? undefined,
    jurisdiction,
    verificationStatus:
      record?.status === "approved" ? "verified" : "pending",
  };
}

export async function getOfficerDataAccessAction() {
  const session = await requireApprovedOfficer();
  const profile = await getOfficerProfileAction();
  const { getMyApprovalAuthorityAction } = await import("./access-requests");
  const authority = await getMyApprovalAuthorityAction();
  return { role: profile.role, jurisdiction: profile.jurisdiction, organization: profile.organization,
    canApprove: !session.user.isDemo && authority.canApproveOfficerAccess,
    canRunSimulation: session.user.isDemo === true,
    scopeSummary: `Authorized surveillance scope: ${profile.jurisdiction ?? "assigned jurisdiction"}.` };
}

/** Settings that currently have only synthetic adapters must never serve normal accounts. */
export async function requireDemoSettingsAction() {
  const session = await requireApprovedOfficer();
  if (!session.user.isDemo) throw new Error("These settings are currently unavailable. No changes were saved.");
}
