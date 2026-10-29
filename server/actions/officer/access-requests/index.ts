"use server";

import { requireLiveOfficer as requireApprovedOfficer, requireCapability } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { AccessRequest } from "@/server/models";
import { ApprovalDecision } from "@/server/models";
import { User } from "@/server/models";
import { OfficerProfile, Jurisdiction } from "@/server/models";
import { sendNotification } from "@/server/services/notifications";
import { OFFICER_PORTAL_CAPABILITIES } from "@/server/auth/officer-capabilities";
import { sendApprovalEmail } from "@/server/services/email";
import { auth } from "@/server/auth/config";
import type { ApprovalAuthority } from "@/types";
import {
  NO_APPROVAL_AUTHORITY,
  decideApprovalAccess,
  denialMessage,
  normalizeApprovalScope,
} from "@/server/auth/approval-authority";

export interface ApprovalAuthorityResult extends ApprovalAuthority {
  /**
   * Backend-resolved display names of the jurisdictions the officer may
   * approve for (empty when the officer has no approval authority).
   */
  authorizedJurisdictions: string[];
}

function deniedAuthority(): ApprovalAuthorityResult {
  return { canApproveOfficerAccess: false, approvalScope: null, authorizedJurisdictions: [] };
}

/**
 * Backend source of truth for the current session's approval authority.
 * Read from the authenticated officer's profile — never derived from
 * designation, organisation, or any client-supplied claim. Fail-closed:
 * anything unknown (no session, no/pending profile, no grant) denies.
 */
export async function getMyApprovalAuthorityAction(): Promise<ApprovalAuthorityResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return deniedAuthority();
  }

  await connectDB();

  const account = await User.findById(session.user.id).select("isDemo").lean();
  if (account?.isDemo) return deniedAuthority();
  const profile = await OfficerProfile.findOne({ user: session.user.id }).lean();
  if (!profile || profile.status !== "approved") {
    return deniedAuthority();
  }
  if (profile.approvalAuthority?.canApproveOfficerAccess !== true) {
    return deniedAuthority();
  }
  const approvalScope = normalizeApprovalScope(profile.approvalAuthority?.approvalScope);
  if (!approvalScope) {
    return deniedAuthority();
  }

  let authorizedJurisdictions: string[] = [];
  if (profile.jurisdiction) {
    const jurisdiction = await Jurisdiction.findById(profile.jurisdiction).lean();
    if (jurisdiction?.name) {
      authorizedJurisdictions = [jurisdiction.name];
    }
  }
  return { canApproveOfficerAccess: true, approvalScope, authorizedJurisdictions };
}

/**
 * Resolve whether a target jurisdiction sits inside an approver's
 * jurisdiction subtree by walking the Jurisdiction parent chain.
 */
async function isInApproverSubtree(
  approverJurisdictionId: string,
  targetJurisdictionId: string,
): Promise<boolean> {
  let current: string | null = targetJurisdictionId;
  const seen = new Set<string>();
  for (let depth = 0; depth < 12 && current && !seen.has(current); depth++) {
    seen.add(current);
    if (current === approverJurisdictionId) {
      return true;
    }
    const child = (await Jurisdiction.findById(current).select("parent").lean()) as unknown as {
      parent?: { toString(): string } | null;
    } | null;
    current = child?.parent?.toString() ?? null;
  }
  return current === approverJurisdictionId;
}

/**
 * Enforce the approver's authority for a specific request. Throws when the
 * approver lacks the explicit grant or the request falls outside their
 * scope. Federal approvers act within national scope; state approvers only
 * within their authorized state. Missing jurisdiction data fails closed for
 * state scope. Approval never grants authority to the applicant — the
 * applicant profile is left without approvalAuthority (default: no grant).
 *
 * Exported for reuse by the authorized evidence endpoint so file access is
 * guarded by the exact same enforcement as approve/reject decisions.
 */
export async function requireApprovalAuthorityForRequest(
  approverUserId: string,
  targetJurisdictionId: string | null,
): Promise<void> {
  const session = await requireApprovedOfficer();
  if (session.userId !== approverUserId) {
    throw new Error(NO_APPROVAL_AUTHORITY);
  }
  const approver = await OfficerProfile.findOne({ user: session.userId }).lean();
  const approverJurisdictionId = approver?.jurisdiction?.toString() ?? null;
  let targetInApproverSubtree = false;
  if (approverJurisdictionId && targetJurisdictionId) {
    targetInApproverSubtree =
      approverJurisdictionId === targetJurisdictionId ||
      (await isInApproverSubtree(approverJurisdictionId, targetJurisdictionId));
  }
  const decision = decideApprovalAccess({
    canApproveOfficerAccess:
      approver?.status === "approved" &&
      approver?.approvalAuthority?.canApproveOfficerAccess === true,
    approvalScope: normalizeApprovalScope(approver?.approvalAuthority?.approvalScope),
    approverJurisdictionId,
    targetJurisdictionId,
    targetInApproverSubtree,
  });
  if (!decision.allowed) {
    throw new Error(denialMessage(decision));
  }
}

/**
 * User ids of every officer permitted to review a request in the target
 * jurisdiction. Uses the exact same grant + scope enforcement as
 * approve/reject decisions (explicit grant, federal national scope,
 * state subtree; missing jurisdiction data fails closed for state scope),
 * so notification fan-out can never reach an officer outside their
 * authorized scope. Ordinary approved officers are excluded.
 *
 * Exported for the access-request submission flow, which notifies each
 * returned approver through the existing notification service.
 */
export async function findInScopeApproverUserIds(
  targetJurisdictionId: string | null,
): Promise<string[]> {
  await connectDB();
  const approvers = await OfficerProfile.find({
    status: "approved",
    "approvalAuthority.canApproveOfficerAccess": true,
  })
    .select("user jurisdiction approvalAuthority status")
    .lean();
  const ids: string[] = [];
  for (const approver of approvers) {
    const approverJurisdictionId = approver?.jurisdiction?.toString() ?? null;
    let targetInApproverSubtree = false;
    if (approverJurisdictionId && targetJurisdictionId) {
      targetInApproverSubtree =
        approverJurisdictionId === targetJurisdictionId ||
        (await isInApproverSubtree(approverJurisdictionId, targetJurisdictionId));
    }
    const decision = decideApprovalAccess({
      canApproveOfficerAccess:
        approver?.status === "approved" &&
        approver?.approvalAuthority?.canApproveOfficerAccess === true,
      approvalScope: normalizeApprovalScope(
        approver?.approvalAuthority?.approvalScope,
      ),
      approverJurisdictionId,
      targetJurisdictionId,
      targetInApproverSubtree,
    });
    if (decision.allowed && approver?.user) {
      ids.push(approver.user.toString());
    }
  }
  return ids;
}

// ------------------------------------------------------------------
// Approval queue (read side). Same backend authority as decisions:
// only explicitly granted approvers list or view requests, and state
// approvers see only requests inside their authorized state.
// ------------------------------------------------------------------

export type QueueTab = "pending" | "approved" | "rejected";

export interface AccessRequestQueueItem {
  id: string;
  applicantName: string;
  requestedRole: "lga-officer" | "state-officer";
  roleLabel: string;
  jurisdictionType: "state" | "lga";
  stateId: string | null;
  stateName: string | null;
  lgaId: string | null;
  lgaName: string | null;
  jurisdictionLabel: string;
  submittedAt: string;
  decidedAt: string | null;
  decidedByLabel: string | null;
  status: "pending" | "approved" | "rejected";
  additionalInfo: string;
  rejectionReason: string | null;
  /**
   * Submitted evidence metadata (Official ID / Letter). Bytes are never
   * included in queue payloads — they are served only through the
   * authorized evidence endpoint. Null when no evidence was submitted.
   */
  evidence: {
    fileName: string;
    mimeType: string;
    size: number;
  } | null;
}

export interface AccessRequestQueuePage {
  items: AccessRequestQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: { pending: number; approved: number; rejected: number };
}

const UI_STATUS_TO_DB: Record<QueueTab, "pending" | "approved" | "denied"> = {
  pending: "pending",
  approved: "approved",
  rejected: "denied",
};

/** Gate the queue: explicit grant + scope required (fail-closed). */
async function requireQueueAccess(): Promise<{
  approvalScope: "federal" | "state";
  approverJurisdictionId: string | null;
}> {
  const session = await requireApprovedOfficer();
  if (!session?.user?.id) {
    throw new Error("Not authenticated. Please sign in.");
  }
  await connectDB();
  const approver = await OfficerProfile.findOne({ user: session.user.id }).lean();
  if (
    approver?.status !== "approved" ||
    approver?.approvalAuthority?.canApproveOfficerAccess !== true
  ) {
    throw new Error(NO_APPROVAL_AUTHORITY);
  }
  const approvalScope = normalizeApprovalScope(approver?.approvalAuthority?.approvalScope);
  if (!approvalScope) {
    throw new Error(NO_APPROVAL_AUTHORITY);
  }
  return {
    approvalScope,
    approverJurisdictionId: approver?.jurisdiction?.toString() ?? null,
  };
}

interface JurisdictionNode {
  id: string;
  name: string;
  level: string;
}

/** Walk the Jurisdiction parent chain (self first, up to 12 levels). */
async function jurisdictionAncestors(startId: string): Promise<JurisdictionNode[]> {
  const chain: JurisdictionNode[] = [];
  const seen = new Set<string>();
  let current: string | null = startId;
  for (let depth = 0; depth < 12 && current && !seen.has(current); depth++) {
    seen.add(current);
    const doc = (await Jurisdiction.findById(current).lean()) as unknown as {
      _id: { toString(): string };
      name?: string;
      level?: string;
      parent?: { toString(): string } | null;
    } | null;
    if (!doc) {
      return chain;
    }
    chain.push({
      id: doc._id.toString(),
      name: doc.name ?? doc._id.toString(),
      level: doc.level ?? "",
    });
    current = doc.parent?.toString() ?? null;
  }
  return chain;
}

/** Map one stored request to the queue item shape using real stored fields. */
async function toQueueItem(requestId: string): Promise<AccessRequestQueueItem | null> {
  const request = await AccessRequest.findById(requestId).lean();
  if (!request) {
    return null;
  }
  const applicantProfile = await OfficerProfile.findById(request.officer).lean();
  const applicantUser = applicantProfile
    ? await User.findById(applicantProfile.user).lean()
    : null;
  const targetJurisdictionId =
    request.jurisdiction?.toString() ??
    applicantProfile?.jurisdiction?.toString() ??
    null;
  const ancestors = targetJurisdictionId
    ? await jurisdictionAncestors(targetJurisdictionId)
    : [];
  const self = ancestors[0] ?? null;
  const stateAncestor = ancestors.find((n) => n.level === "state" || n.level === "country") ?? null;
  const lgaAncestor = ancestors.find((n) => n.level === "lga") ?? null;
  const isStateLevel = !self || self.level === "state" || self.level === "country";
  const decision = await ApprovalDecision.findOne({ accessRequest: request._id })
    .sort({ decidedAt: -1, createdAt: -1 })
    .lean();
  const decidedByUser = decision
    ? await User.findById(decision.decidedBy).lean()
    : null;
  const submittedAt = request.requestedAt ?? request.createdAt;
  return {
    id: request._id.toString(),
    applicantName: applicantUser?.name ?? "Unknown applicant",
    requestedRole: isStateLevel ? "state-officer" : "lga-officer",
    roleLabel: isStateLevel ? "State Officer" : "LGA Officer",
    jurisdictionType: isStateLevel ? "state" : "lga",
    stateId: stateAncestor ? stateAncestor.id : null,
    stateName: stateAncestor ? stateAncestor.name : null,
    lgaId: !isStateLevel && lgaAncestor ? lgaAncestor.id : null,
    lgaName: !isStateLevel && lgaAncestor ? lgaAncestor.name : null,
    jurisdictionLabel: self ? self.name : "Unspecified jurisdiction",
    submittedAt: submittedAt ? new Date(submittedAt).toISOString() : new Date().toISOString(),
    decidedAt: request.decidedAt ? new Date(request.decidedAt).toISOString() : null,
    decidedByLabel: decidedByUser?.name ?? null,
    status: request.status === "denied" ? "rejected" : request.status === "approved" ? "approved" : "pending",
    additionalInfo: request.justification ?? "",
    rejectionReason:
      request.status === "denied" ? (decision?.reason?.trim() ? (decision.reason as string) : null) : null,
    evidence:
      request.evidence?.data && request.evidence?.fileName && request.evidence?.mimeType
        ? {
            fileName: request.evidence.fileName as string,
            mimeType: request.evidence.mimeType as string,
            size:
              typeof request.evidence.size === "number"
                ? (request.evidence.size as number)
                : 0,
          }
        : null,
  };
}

/** Whether a request (by resolved target jurisdiction) is visible to the approver. */
async function isRequestInApproverScope(
  approvalScope: "federal" | "state",
  approverJurisdictionId: string | null,
  targetJurisdictionId: string | null,
): Promise<boolean> {
  if (approvalScope === "federal") {
    return true;
  }
  if (!approverJurisdictionId || !targetJurisdictionId) {
    return false;
  }
  if (approverJurisdictionId === targetJurisdictionId) {
    return true;
  }
  return isInApproverSubtree(approverJurisdictionId, targetJurisdictionId);
}

async function resolveTargetJurisdictionId(requestId: string): Promise<string | null> {
  const request = await AccessRequest.findById(requestId).select("officer jurisdiction").lean();
  if (!request) {
    return null;
  }
  if (request.jurisdiction) {
    return request.jurisdiction.toString();
  }
  const applicantProfile = await OfficerProfile.findById(request.officer)
    .select("jurisdiction")
    .lean();
  return applicantProfile?.jurisdiction?.toString() ?? null;
}

/**
 * Pending/decided access requests visible to the current approver, newest
 * first. Federal approvers see every request in scope; state approvers see
 * only their authorized state. Throws for unauthorized callers.
 */
export async function getAccessRequestsAction(params?: {
  status?: QueueTab;
  page?: number;
  limit?: number;
}): Promise<AccessRequestQueuePage> {
  const { approvalScope, approverJurisdictionId } = await requireQueueAccess();
  const tab: QueueTab =
    params?.status === "approved" || params?.status === "rejected" ? params.status : "pending";
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const limit = Math.min(50, Math.max(1, Math.floor(params?.limit ?? 10)));

  const counts = { pending: 0, approved: 0, rejected: 0 };
  const tabs: QueueTab[] = ["pending", "approved", "rejected"];
  const visibleByTab = new Map<QueueTab, string[]>();
  for (const t of tabs) {
    const docs = await AccessRequest.find({ status: UI_STATUS_TO_DB[t] })
      .sort({ requestedAt: -1, createdAt: -1 })
      .select("_id officer jurisdiction")
      .lean();
    const visible: string[] = [];
    for (const doc of docs) {
      const targetId =
        doc.jurisdiction?.toString() ??
        (
          await OfficerProfile.findById(doc.officer).select("jurisdiction").lean()
        )?.jurisdiction?.toString() ??
        null;
      if (await isRequestInApproverScope(approvalScope, approverJurisdictionId, targetId)) {
        visible.push(doc._id.toString());
      }
    }
    visibleByTab.set(t, visible);
    counts[t] = visible.length;
  }

  const ids = visibleByTab.get(tab) ?? [];
  const total = ids.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const slice = ids.slice((page - 1) * limit, page * limit);
  const items: AccessRequestQueueItem[] = [];
  for (const id of slice) {
    const item = await toQueueItem(id);
    if (item) {
      items.push(item);
    }
  }
  return { items, total, page, limit, totalPages, counts };
}

/**
 * One request for the review flow, scope-checked with the exact same
 * enforcement as approve/reject decisions.
 */
export async function getAccessRequestAction(requestId: string): Promise<AccessRequestQueueItem> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated. Please sign in.");
  }
  await connectDB();
  const targetId = await resolveTargetJurisdictionId(requestId);
  await requireApprovalAuthorityForRequest(session.user.id, targetId);
  const item = await toQueueItem(requestId);
  if (!item) {
    throw new Error("Access request not found");
  }
  return item;
}

export async function approveAccessRequestAction(requestId: string) {
  const session = await requireCapability("access:approve");

  await connectDB();

  const accessRequest = await AccessRequest.findById(requestId).lean();
  if (!accessRequest) {
    throw new Error("Access request not found");
  }
  if (accessRequest.status !== "pending") {
    throw new Error("Access request has already been decided");
  }
  if (
    !accessRequest.jurisdiction ||
    !session.jurisdictionIds.includes(accessRequest.jurisdiction.toString())
  ) {
    throw new Error(
      "Forbidden: request is outside your approved jurisdiction.",
    );
  }
  const applicant = await OfficerProfile.findById(accessRequest.officer).lean();
  if (!applicant || applicant.user.toString() === session.userId)
    throw new Error("You cannot decide your own access request.");

  await requireApprovalAuthorityForRequest(
    session.userId,
    accessRequest.jurisdiction.toString(),
  );

  const account = await User.findById(applicant.user)
    .select("+passwordHash")
    .lean();
  if (!account || account.role === "admin" || account.accountStatus !== "active")
    throw new Error("Applicant account is unavailable.");
  await AccessRequest.db.transaction(async (transaction) => {
    const changed = await AccessRequest.updateOne(
      { _id: requestId, status: "pending" },
      { $set: { status: "approved", decidedAt: new Date() } },
      { session: transaction },
    );
    if (changed.modifiedCount !== 1)
      throw new Error("This request has already been decided.");
    await ApprovalDecision.create(
      [
        {
          accessRequest: requestId,
          decidedBy: session.userId,
          decision: "approved",
          reason: "Approved by authorized officer",
          decidedAt: new Date(),
        },
      ],
      { session: transaction },
    );
    // Portal access never grants approval authority or approval capabilities.
    const profileUpdate = await OfficerProfile.updateOne(
      { _id: applicant._id, user: applicant.user },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
          jurisdiction: accessRequest.jurisdiction,
          ...(applicant.setupRequired ? { capabilities: OFFICER_PORTAL_CAPABILITIES, organizationName: accessRequest.applicant?.organization, governmentLevel: accessRequest.applicant?.governmentLevel } : {}),
        },
      },
      { session: transaction },
    );
    if (profileUpdate.matchedCount !== 1)
      throw new Error("Applicant Officer profile is no longer available.");
    const userUpdate = await User.updateOne(
      { _id: applicant.user, role: { $in: ["officer", "citizen"] }, accountStatus: "active" },
      { $set: { role: "officer" } },
      { session: transaction },
    );
    if (userUpdate.matchedCount !== 1)
      throw new Error("Applicant account is no longer available.");
  });

  const user = await User.findById(applicant.user).lean();

  if (user) {
    // Send in-app notification
    await sendNotification(user._id.toString(), {
      type: "approval",
      title: "Access Request Approved",
      body: `Your Officer access request has been approved. Use Check Approval Status to complete account setup, then sign in.`,
      channel: "in_app",
      metadata: { accessRequestId: requestId },
    }).catch(() => console.error("[officer.decision] In-app notification unavailable"));

    // Send email notification (non-blocking - don't fail approval if email fails)
    let emailSent = false;
    let emailError: string | undefined;
    try {
      const emailResult = await sendApprovalEmail(user.email, user.name, true);
      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = "Email delivery unavailable. Check server SMTP diagnostics.";
        console.error(
          "[ApprovalEmail] Failed to send approval email:",
          emailError,
        );
      }
    } catch (err) {
      emailError = "Email delivery unavailable.";
      console.error("[ApprovalEmail] Notification unavailable");
    }

    // Log email delivery status separately from approval status
    await sendNotification(user._id.toString(), {
      type: "system",
      title: emailSent
        ? "Approval Email Sent"
        : "Approval Email Delivery Failed",
      body: emailSent
        ? "The approval notification email was sent successfully."
        : `The approval notification email could not be delivered: ${emailError || "Unknown error"}. The approval status is still active.`,
      channel: "in_app",
      metadata: { accessRequestId: requestId, emailSent, emailError },
    }).catch(() => console.error("[officer.decision] In-app notification unavailable"));
  }

  return { success: true, message: "Access request approved successfully" };
}

export async function rejectAccessRequestAction(
  requestId: string,
  reason: string,
) {
  const session = await requireCapability("access:approve");

  if (!reason?.trim()) {
    throw new Error("A rejection reason is required");
  }

  await connectDB();

  const accessRequest = await AccessRequest.findById(requestId).lean();
  if (!accessRequest) {
    throw new Error("Access request not found");
  }
  if (accessRequest.status !== "pending") {
    throw new Error("Access request has already been decided");
  }
  if (
    !accessRequest.jurisdiction ||
    !session.jurisdictionIds.includes(accessRequest.jurisdiction.toString())
  ) {
    throw new Error(
      "Forbidden: request is outside your approved jurisdiction.",
    );
  }
  const applicant = await OfficerProfile.findById(accessRequest.officer).lean();
  if (!applicant || applicant.user.toString() === session.userId)
    throw new Error("You cannot decide your own access request.");

  await requireApprovalAuthorityForRequest(
    session.userId,
    accessRequest.jurisdiction.toString(),
  );


  // Claim and audit the decision together. A concurrent approval/rejection
  // cannot win after this transaction commits; failed audit writes roll back.
  await AccessRequest.db.transaction(async (transaction) => {
    const changed = await AccessRequest.updateOne(
      { _id: requestId, status: "pending" },
      { $set: { status: "denied", decidedAt: new Date() } },
      { session: transaction },
    );
    if (changed.modifiedCount !== 1)
      throw new Error("Access request has already been decided");
    await ApprovalDecision.create(
      [
        {
          accessRequest: requestId,
          decidedBy: session.userId,
          decision: "denied",
          reason: reason.trim(),
          decidedAt: new Date(),
        },
      ],
      { session: transaction },
    );
  });

  const user = await User.findById(applicant.user).lean();
  if (user) {
    // Send in-app notification
    await sendNotification(user._id.toString(), {
      type: "approval",
      title: "Access Request Declined",
      body: `Your Officer access request was not approved. Contact your authority if you need further guidance.`,
      channel: "in_app",
      metadata: { accessRequestId: requestId },
    }).catch(() => console.error("[officer.decision] In-app notification unavailable"));

    // Send email notification (non-blocking)
    let emailSent = false;
    let emailError: string | undefined;
    try {
      const emailResult = await sendApprovalEmail(
        user.email,
        user.name,
        false,
        undefined,
      );
      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = "Email delivery unavailable. Check server SMTP diagnostics.";
        console.error(
          "[RejectionEmail] Failed to send rejection email:",
          emailError,
        );
      }
    } catch (err) {
      emailError = "Email delivery unavailable.";
      console.error("[RejectionEmail] Notification unavailable");
    }

    // Log email delivery status separately
    await sendNotification(user._id.toString(), {
      type: "system",
      title: emailSent
        ? "Rejection Email Sent"
        : "Rejection Email Delivery Failed",
      body: emailSent
        ? "The rejection notification email was sent successfully."
        : `The rejection notification email could not be delivered: ${emailError || "Unknown error"}. The rejection status is still active.`,
      channel: "in_app",
      metadata: { accessRequestId: requestId, emailSent, emailError },
    }).catch(() => console.error("[officer.decision] In-app notification unavailable"));
  }

  return { success: true, message: "Access request rejected" };
}

export async function getMyAccessRequestAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  await connectDB();

  const officerProfile = await OfficerProfile.findOne({
    user: session.user.id,
  }).lean();
  if (!officerProfile) {
    return null;
  }

  const accessRequest = await AccessRequest.findOne({
    officer: officerProfile._id,
  })
    .sort({ createdAt: -1 })
    .lean();
  if (!accessRequest) {
    return null;
  }

  return {
    id: accessRequest._id.toString(),
    status: accessRequest.status,
    submittedAt: accessRequest.createdAt,
    decidedAt: accessRequest.decidedAt,
    justification: accessRequest.justification,
  };
}

export async function getApprovalPermissionsAction() {
  const session = await requireApprovedOfficer();
  const { Jurisdiction } = await import("@/server/models");
  const profile = await OfficerProfile.findById(
    session.officerProfileId,
  ).lean();
  const jurisdiction = profile?.jurisdiction
    ? await Jurisdiction.findById(profile.jurisdiction).lean()
    : null;
  const scope =
    jurisdiction?.level === "country"
      ? ("national" as const)
      : jurisdiction?.level === "state"
        ? ("state" as const)
        : jurisdiction?.level === "lga"
          ? ("lga" as const)
          : null;
  return {
    canApprove:
      session.capabilities.includes("access:approve") && scope !== null,
    scope,
    authorizedJurisdictions: jurisdiction ? [jurisdiction.code] : [],
  };
}
