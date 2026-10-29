// Dev 4 owns this service (privacy/access control). Officer access requests.
// Stub — replace throws. Must enforce consent + Jurisdictional RBAC (see /server/auth/rbac).
import type { AccessRequest, OfficerProfile } from "@/server/models";

export async function requestAccess(
  officerProfileId: string,
  input: Partial<AccessRequest>,
): Promise<AccessRequest> {
  throw new Error("Not implemented — Dev 4");
}

export async function getAccessStatus(
  officerProfileId: string,
): Promise<AccessRequest | null> {
  throw new Error("Not implemented — Dev 4");
}

export async function getOfficerProfile(
  userId: string,
): Promise<OfficerProfile | null> {
  throw new Error("Not implemented — Dev 4");
}
