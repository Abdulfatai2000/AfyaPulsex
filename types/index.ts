// Shared TypeScript types for AfyaPulse — imported by both /app and /server.
// These mirror the Zod schemas in /server/validation and the model enums in
// /server/models. Keep them in sync when enums change.
import type { Session } from "next-auth";

export type UserRole = "citizen" | "officer" | "admin";

export type OfficerStatus = "pending" | "approved" | "suspended";

export type AccessRequestStatus = "pending" | "approved" | "denied" | "expired";

/**
 * Approval authority scope — where an approver may approve officer access.
 * "federal" (Federal/National Authorized Approver) may approve within the
 * permitted national scope; "state" (State Authorized Approver) only within
 * its authorized state. Backend-owned (OfficerProfile.approvalAuthority).
 */
export type ApprovalAuthorityScope = "federal" | "state";

/**
 * Whether an officer may approve another officer's access request.
 * Explicitly granted/provisioned on the backend — never inferred from
 * designation, organisation, government level, or jurisdiction alone.
 */
export interface ApprovalAuthority {
  canApproveOfficerAccess: boolean;
  approvalScope: ApprovalAuthorityScope | null;
}

export type AlertLevel = "info" | "watch" | "warning" | "critical";

export type Severity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type Capability = string;

export type VitalType =
  | "blood_pressure"
  | "heart_rate"
  | "temperature"
  | "spo2"
  | "weight"
  | "glucose"
  | "respiration_rate";

/** Authenticated citizen identity, derived from the session server-side. */
export interface CitizenContext {
  userId: string;
  role: "citizen";
}

/** Authenticated, approved officer identity with capabilities + jurisdictions. */
export interface OfficerContext {
  userId: string;
  role: "officer";
  officerProfileId: string;
  capabilities: string[];
  jurisdictionIds: string[];
}

/** Authenticated admin identity. */
export interface AdminContext {
  userId: string;
  role: "admin";
}

export type UserSession = Session & {
  user?: Session["user"] & { id?: string; role?: UserRole };
};
