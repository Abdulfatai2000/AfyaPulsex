/**
 * Officer access approvals — typed frontend adapter (real backend implementation).
 *
 * Purpose: the Approvals / For-Authorized-Officers center. Having access to
 * AfyaPulse does NOT imply approval authority. Whether the current officer can
 * approve (and at which scope / jurisdiction / roles) is a SEPARATE permission,
 * provided by the backend and consumed here — never derived from UI role names.
 *
 * SECURITY BOUNDARY (DEV4):
 * - This module is the ONLY way components learn about approval authority and
 *   access requests. The React layer renders whatever permissions/requests this
 *   service returns and never decides who may approve.
 * - No hardcoded rules like `role === "State Officer" → canApprove` exist here
 *   or in any component. The permission object is backend-authored.
 * - `getAccessRequests` returns ONLY requests within the officer's authorized
 *   jurisdiction. The UI never filters by jurisdiction itself, so it can't
 *   bypass backend scoping.
 * - Applicant names are officers/candidates requesting portal access — an
 *   organizational matter, never citizen information.
 * - No MongoDB access and no backend credentials exist in this code; the
 *   backend remains the source of truth for authorization.
 */

import { geographyService } from "./geography";

/* ------------------------------------------------------------------ *
 * Domain types.
 * ------------------------------------------------------------------ */

export type AccessRequestStatus = "pending" | "approved" | "rejected";

export type AccessRequestRole = "lga-officer" | "state-officer";

export type ApprovalScope = "lga" | "state" | "national";

/** Tab over the approval queue — "pending" is the default active tab. */
export type ApprovalsTab = AccessRequestStatus;

export interface ApprovalPermissions {
  /** Backend-authoritative: may this officer approve access requests? */
  canApprove: boolean;

  /** Highest scope this officer may approve across (null when denied). */
  scope: ApprovalScope | null;

  /** Jurisdiction codes the officer is authorized to approve for. */
  authorizedJurisdictions: string[];
}

export interface AccessRequest {
  id: string;
  applicantName: string;
  requestedRole: AccessRequestRole;
  roleLabel: string;

  /** "state" for a State-level request, "lga" for an LGA-level request. */
  jurisdictionType: "state" | "lga";

  stateId: string;
  stateName: string;

  lgaId: string | null;
  lgaName: string | null;

  jurisdictionLabel: string;

  submittedAt: string;
  decidedAt: string | null;
  decidedByLabel: string | null;

  status: AccessRequestStatus;

  /** Additional information supplied by the applicant. */
  additionalInfo: string;

  /** Backend-provided reason, present on rejected requests where supplied. */
  rejectionReason: string | null;

  /**
   * Submitted evidence metadata.
   * File bytes are never included here. They load on demand through the
   * authorized evidence endpoint.
   */
  evidence: {
    fileName: string;
    mimeType: string;
    size: number;
  } | null;
}

export interface GetAccessRequestsParams {
  status?: ApprovalsTab;
  page?: number;
  limit?: number;
}

export interface AccessRequestsCounts {
  pending: number;
  approved: number;
  rejected: number;
}

export interface AccessRequestsPage {
  items: AccessRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: AccessRequestsCounts;
}

export type ApprovalsDataStatus =
  | "loading"
  | "ready"
  | "empty"
  | "permission-denied"
  | "session-expired"
  | "error";

export class ApprovalsServiceError extends Error {
  constructor(
    public code:
      | "permission-denied"
      | "unauthorized"
      | "network"
      | "invalid",
    message?: string,
  ) {
    super(message);
    this.name = "ApprovalsServiceError";
  }
}

/* ------------------------------------------------------------------ *
 * Constants (labels only — no authority rules).
 * ------------------------------------------------------------------ */

export const APPROVAL_TABS: ReadonlyArray<{
  value: ApprovalsTab;
  label: string;
  description: string;
}> = [
  {
    value: "pending",
    label: "Pending",
    description: "Access requests requiring your decision.",
  },
  {
    value: "approved",
    label: "Approved",
    description:
      "Previously approved access requests with their final status/history.",
  },
  {
    value: "rejected",
    label: "Rejected",
    description:
      "Previously rejected requests, with reason where provided.",
  },
];

export const REQUESTED_ROLE_LABELS: Record<AccessRequestRole, string> = {
  "lga-officer": "LGA Officer",
  "state-officer": "State Officer",
};

/* ------------------------------------------------------------------ *
 * Real backend service API.
 * ------------------------------------------------------------------ */

/**
 * Backend-authored approval capability for the current officer.
 * The UI never derives authority from role names — it renders only what
 * this returns.
 */
export async function getApprovalPermissions(): Promise<ApprovalPermissions> {
  const { getApprovalPermissionsAction } =
    await import("@/server/actions/officer/access-requests");

  return getApprovalPermissionsAction();
}

/**
 * Human-readable summary of the officer's approval authority, resolved
 * through the shared geography service.
 *
 * Returns null when the officer cannot approve.
 */
export async function describeApprovalAuthority(
  permissions: ApprovalPermissions,
): Promise<string | null> {
  if (!permissions.canApprove || !permissions.scope) {
    return null;
  }

  const scopeLabel =
    permissions.scope === "national"
      ? "National"
      : permissions.scope === "state"
        ? "State"
        : "LGA";

  const names: string[] = [];

  for (const code of permissions.authorizedJurisdictions) {
    const state = await geographyService.getStateById(code);
    names.push(state?.name ?? code);
  }

  return names.length
    ? `Scope: ${scopeLabel} — ${names.join(", ")}`
    : `Scope: ${scopeLabel}`;
}

/**
 * Access requests for the officer's authorized scope, newest first,
 * with per-tab counts for the filter row.
 *
 * The server action enforces approval authority and jurisdiction scope.
 * This adapter only maps server errors into the service error contract.
 */
export async function getAccessRequests({
  status = "pending",
  page = 1,
  limit = 10,
}: GetAccessRequestsParams = {}): Promise<AccessRequestsPage> {
  try {
    const { getAccessRequestsAction } =
      await import("@/server/actions/officer/access-requests");

    const data = await getAccessRequestsAction({
      status,
      page,
      limit,
    });

    return {
      items: data.items.map((item) => ({
        id: item.id,
        applicantName: item.applicantName,
        requestedRole: item.requestedRole,
        roleLabel: item.roleLabel,
        jurisdictionType: item.jurisdictionType,
        stateId: item.stateId ?? "",
        stateName: item.stateName ?? "",
        lgaId: item.lgaId,
        lgaName: item.lgaName,
        jurisdictionLabel: item.jurisdictionLabel,
        submittedAt: item.submittedAt,
        decidedAt: item.decidedAt,
        decidedByLabel: item.decidedByLabel,
        status: item.status,
        additionalInfo: item.additionalInfo,
        rejectionReason: item.rejectionReason,
        evidence: item.evidence,
      })),
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
      counts: data.counts,
    };
  } catch (err) {
    throw mapQueueError(err);
  }
}

/**
 * Authorized URL for a request's submitted evidence bytes.
 *
 * The backend endpoint performs the actual authorization check. The session
 * cookie accompanies the browser request.
 */
export function getAccessRequestEvidenceUrl(requestId: string): string {
  return `/api/officer/access-requests/${encodeURIComponent(
    requestId,
  )}/evidence`;
}

/** Single access request detail by id — used by the review flow. */
export async function getAccessRequest(
  requestId: string,
): Promise<AccessRequest> {
  try {
    const { getAccessRequestAction } =
      await import("@/server/actions/officer/access-requests");

    const item = await getAccessRequestAction(requestId);

    return {
      id: item.id,
      applicantName: item.applicantName,
      requestedRole: item.requestedRole,
      roleLabel: item.roleLabel,
      jurisdictionType: item.jurisdictionType,
      stateId: item.stateId ?? "",
      stateName: item.stateName ?? "",
      lgaId: item.lgaId,
      lgaName: item.lgaName,
      jurisdictionLabel: item.jurisdictionLabel,
      submittedAt: item.submittedAt,
      decidedAt: item.decidedAt,
      decidedByLabel: item.decidedByLabel,
      status: item.status,
      additionalInfo: item.additionalInfo,
      rejectionReason: item.rejectionReason,
      evidence: item.evidence,
    };
  } catch (err) {
    throw mapQueueError(err);
  }
}

/**
 * Map server-action failures to the queue error codes the UI understands.
 *
 * Authority denials stay permission-denied.
 * Authentication failures stay unauthorized.
 * Nothing is downgraded to a silent empty list.
 */
function mapQueueError(err: unknown): ApprovalsServiceError {
  const message =
    err instanceof Error
      ? err.message
      : "Something went wrong loading access requests.";

  if (/not authenticated|session|sign in|redirect|unauthorized/i.test(message)) {
    return new ApprovalsServiceError("unauthorized", message);
  }

  if (
    /approval authority|authorized approval scope|permission/i.test(message)
  ) {
    return new ApprovalsServiceError("permission-denied", message);
  }

  if (/not found/i.test(message)) {
    return new ApprovalsServiceError("invalid", message);
  }

  return new ApprovalsServiceError("network", message);
}

/**
 * Approve an access request.
 *
 * Authorization, role promotion, persistence and notification are handled
 * by the backend server action.
 */
export async function approveAccessRequest(
  requestId: string,
): Promise<AccessRequest> {
  const { approveAccessRequestAction } =
    await import("@/server/actions/officer/access-requests");

  const result = await approveAccessRequestAction(requestId);

  if (!result.success) {
    throw new ApprovalsServiceError(
      "invalid",
      result.message || "Failed to approve request",
    );
  }

  /*
   * The current UI only needs enough information to update its local row.
   * The server remains the source of truth and the next fetch will return
   * the complete backend record.
   */
  return {
    id: requestId,
    applicantName: "",
    requestedRole: "lga-officer",
    roleLabel: "LGA Officer",
    jurisdictionType: "lga",
    stateId: "",
    stateName: "",
    lgaId: null,
    lgaName: null,
    jurisdictionLabel: "",
    submittedAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
    decidedByLabel: "You (current session)",
    status: "approved",
    additionalInfo: "",
    rejectionReason: null,
    evidence: null,
  };
}

/**
 * Reject an access request with a required reason.
 *
 * Authorization, persistence and notification are handled by the backend
 * server action.
 */
export async function rejectAccessRequest(
  requestId: string,
  reason: string,
): Promise<AccessRequest> {
  const { rejectAccessRequestAction } =
    await import("@/server/actions/officer/access-requests");

  const result = await rejectAccessRequestAction(requestId, reason);

  if (!result.success) {
    throw new ApprovalsServiceError(
      "invalid",
      result.message || "Failed to reject request",
    );
  }

  return {
    id: requestId,
    applicantName: "",
    requestedRole: "lga-officer",
    roleLabel: "LGA Officer",
    jurisdictionType: "lga",
    stateId: "",
    stateName: "",
    lgaId: null,
    lgaName: null,
    jurisdictionLabel: "",
    submittedAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
    decidedByLabel: "You (current session)",
    status: "rejected",
    additionalInfo: "",
    rejectionReason: reason,
    evidence: null,
  };
}

/** Derive the list status from a loaded page (empty vs ready). */
export function deriveApprovalsStatus(
  itemsLength: number,
): "ready" | "empty" {
  return itemsLength === 0 ? "empty" : "ready";
}