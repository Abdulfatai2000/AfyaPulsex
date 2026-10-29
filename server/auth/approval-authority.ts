// Pure approval-authority decision helpers — DB-free so the rules can be
// unit-tested without touching the database.
//
// Backend source of truth lives on OfficerProfile.approvalAuthority:
//   { canApproveOfficerAccess: boolean, approvalScope: "federal" | "state" }
// Approval authority is granted explicitly, never inferred from designation
// (DSO/DSNO/etc.), organisation, or government level. Everything unknown or
// legacy fails closed (denied).
import type { ApprovalAuthorityScope } from "@/types";

export const NO_APPROVAL_AUTHORITY: string =
  "You do not have approval authority for officer access requests.";

export const OUTSIDE_APPROVAL_SCOPE: string =
  "This request is outside your authorized approval scope.";

/**
 * Fail-closed normalization of the stored scope. Only the exact contract
 * values "federal" | "state" are accepted; anything else (missing, legacy
 * uppercase, novel values) becomes null, which always denies.
 */
export function normalizeApprovalScope(value: unknown): ApprovalAuthorityScope | null {
  return value === "federal" || value === "state" ? value : null;
}

export interface ApprovalAccessInput {
  canApproveOfficerAccess: boolean;
  approvalScope: ApprovalAuthorityScope | null;
  /** Approver's own jurisdiction id (stringified ObjectId), if any. */
  approverJurisdictionId: string | null;
  /** Applicant/request jurisdiction id (stringified ObjectId), if any. */
  targetJurisdictionId: string | null;
  /**
   * Whether the target jurisdiction sits inside the approver's jurisdiction
   * subtree (resolved server-side via the Jurisdiction parent chain).
   */
  targetInApproverSubtree: boolean;
}

export interface ApprovalAccessDecision {
  allowed: boolean;
  /** Machine-stable reason for logs/tests; callers map to user messages. */
  reason:
    | "no-grant"
    | "no-scope"
    | "federal-scope"
    | "same-jurisdiction"
    | "state-subtree"
    | "outside-scope";
}

/**
 * Pure authority + scope decision:
 * - federal approvers may approve within their permitted national scope
 *   (any request, including ones without jurisdiction data).
 * - state approvers may approve only their own jurisdiction or requests
 *   inside their authorized state subtree; missing jurisdiction data denies.
 * - ordinary approved officers (no explicit grant) are always denied,
 *   regardless of designation.
 */
export function decideApprovalAccess(input: ApprovalAccessInput): ApprovalAccessDecision {
  if (input.canApproveOfficerAccess !== true) {
    return { allowed: false, reason: "no-grant" };
  }
  const scope = normalizeApprovalScope(input.approvalScope);
  if (!scope) {
    return { allowed: false, reason: "no-scope" };
  }
  if (scope === "federal") {
    return { allowed: true, reason: "federal-scope" };
  }
  if (
    input.approverJurisdictionId &&
    input.targetJurisdictionId &&
    input.approverJurisdictionId === input.targetJurisdictionId
  ) {
    return { allowed: true, reason: "same-jurisdiction" };
  }
  if (
    input.approverJurisdictionId &&
    input.targetJurisdictionId &&
    input.targetInApproverSubtree
  ) {
    return { allowed: true, reason: "state-subtree" };
  }
  return { allowed: false, reason: "outside-scope" };
}

/** User-facing message for a denied pure decision. */
export function denialMessage(decision: ApprovalAccessDecision): string {
  return decision.reason === "no-grant" || decision.reason === "no-scope"
    ? NO_APPROVAL_AUTHORITY
    : OUTSIDE_APPROVAL_SCOPE;
}
