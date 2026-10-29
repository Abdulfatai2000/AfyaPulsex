import { safeErrorCategory } from "@/server/lib/safe-error";
import { connectDB } from "@/server/db/connection";
import { User } from "@/server/models";
import { AccessRequest } from "@/server/models";
import { Jurisdiction } from "@/server/models";
import { sendNotification } from "@/server/services/notifications";
import { sendSubmissionConfirmationEmail } from "@/server/services/email";
import { validateEvidenceFile } from "@/server/auth/access-request-evidence";
import { accessRequestFormSchema } from "@/lib/validation/validators";
import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { OfficerProfile } from "@/server/models";
import { resolveJurisdiction, referenceLocation } from "@/server/services/jurisdiction-resolution";
import { officerRateLimit } from "@/server/services/officer-rate-limit";

const requiredRequestFieldsSchema = accessRequestFormSchema
  .omit({ organizationId: true, customOrgName: true, lgaId: true })
  .extend({
    organization: z.string().trim().min(2).max(300),
    lgaId: z.string().optional(),
  });

export async function POST(req: NextRequest) {
  let stage = "parse";
  let submittedEmail: string | undefined;
  try {
    if (Number(req.headers.get("content-length")) > 6 * 1024 * 1024) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

    // The access-request form submits multipart FormData carrying the
    // evidence file bytes; older JSON clients send the file name only.
    // Either way the persisted evidence contract is the same validated
    // subset (JPEG/PNG/PDF, bounded size).
    let fullName: string | undefined;
    let email: string | undefined;
    let phone: string | undefined;
    let governmentLevel: string | undefined;
    let position: string | undefined;
    let stateId: string | undefined;
    let organization: string | undefined;
    let isOtherOrg: boolean | string | undefined;
    let lgaId: string | undefined;
    let evidenceFileName: string | null | undefined;
    let evidenceBytes: Buffer | null = null;
    let evidenceMimeType: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const pick = (key: string) => {
        const value = form.get(key);
        return typeof value === "string" ? value : undefined;
      };
      fullName = pick("fullName");
      email = pick("email");
      phone = pick("phone");
      governmentLevel = pick("governmentLevel");
      if (form.has("password") || form.has("confirmPassword")) return NextResponse.json({ error: "Passwords are created only after approval." }, { status: 400 });
      position = pick("position");
      stateId = pick("stateId");
      organization = pick("organization");
      isOtherOrg = pick("isOtherOrg");
      lgaId = pick("lgaId");
      const file = form.get("evidenceFile");
      if (file instanceof File && file.size > 0) {
        evidenceFileName = file.name;
        evidenceMimeType = file.type;
        const fileError = validateEvidenceFile({ mimeType: file.type, size: file.size });
        if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
        evidenceBytes = Buffer.from(await file.arrayBuffer());
      } else {
        evidenceFileName = pick("evidenceFileName") ?? null;
      }
    } else {
      const body = await req.json();
      if (body.password !== undefined || body.confirmPassword !== undefined) return NextResponse.json({ error: "Passwords are created only after approval." }, { status: 400 });
      ({ fullName, email, phone, governmentLevel, position, stateId, organization, isOtherOrg, lgaId, evidenceFileName } = body);
    }

    // Normalize both transports to the previous JSON contract: scalar
    // strings (or undefined when absent) plus a boolean other-org flag.
    // Multipart fields always arrive as strings.
    const asText = (value: unknown): string | undefined =>
      typeof value === "string" ? value : undefined;
    fullName = asText(fullName);
    email = asText(email);
    phone = asText(phone);
    governmentLevel = asText(governmentLevel);
    position = asText(position);
    stateId = asText(stateId);
    organization = asText(organization);
    lgaId = asText(lgaId);
    evidenceFileName =
      typeof evidenceFileName === "string" ? evidenceFileName : null;
    isOtherOrg = isOtherOrg === true || isOtherOrg === "true";

    const validatedFields = requiredRequestFieldsSchema.safeParse({
      fullName,
      email,
      position,
      stateId, phone, governmentLevel, organization, lgaId, isOtherOrg,
    });
    if (!validatedFields.success) {
      return NextResponse.json(
        { error: validatedFields.error.issues[0]?.message ?? "Invalid access request." },
        { status: 400 },
      );
    }
    const {
      fullName: validatedFullName,
      email: normalizedEmail,
      position: validatedPosition,
    } = validatedFields.data;
    submittedEmail = normalizedEmail;

    stage = "database";
    await connectDB();
    if (!await officerRateLimit("request:global", 100, 3600) || !await officerRateLimit(`request:${normalizedEmail}`, 3, 3600))
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    const evidence = evidenceBytes && evidenceMimeType
      ? { fileName: evidenceFileName, mimeType: evidenceMimeType, size: evidenceBytes.length, data: evidenceBytes }
      : null;
    if (evidence) {
      const evidenceError = validateEvidenceFile(evidence);
      if (evidenceError) return NextResponse.json({ error: evidenceError }, { status: 400 });
    }
    const input = validatedFields.data;
    try { referenceLocation(input.stateId, input.lgaId); }
    catch { return NextResponse.json({ error: "Select a valid State and its LGA." }, { status: 400 }); }
    // Public intake never changes an existing Citizen, Admin or Officer account.
    if (await User.exists({ email: normalizedEmail })) return NextResponse.json({ message: "If you have already applied, use Check Approval Status. Existing accounts are not changed." }, { status: 202 });
    stage = "jurisdiction";
    const resolved = await resolveJurisdiction(input.stateId, input.governmentLevel === "local" ? input.lgaId : undefined, true);
    const national = input.governmentLevel === "federal" ? await Jurisdiction.findOne({ code: "NG", level: "country" }).lean() : null;
    const jurisdictionId = input.governmentLevel === "federal" ? national?._id : resolved?.jurisdiction._id;
    if (!jurisdictionId) throw new Error("Jurisdiction unavailable");
    await User.init();
    stage = "transaction:user";
    const created = await AccessRequest.db.transaction(async transaction => {
      stage = "transaction:user";
      const [user] = await User.create([{ name: validatedFullName, email: normalizedEmail, role: "officer", accountStatus: "active", isDemo: false, simulation: false }], { session: transaction });
      stage = "transaction:profile";
      const [profile] = await OfficerProfile.create([{ user: user._id, jurisdiction: jurisdictionId, title: validatedPosition, status: "pending", setupRequired: true, organizationName: input.organization, governmentLevel: input.governmentLevel, capabilities: [], simulation: false }], { session: transaction });
      stage = "transaction:request";
      const [request] = await AccessRequest.create([{
        officer: profile._id, jurisdiction: jurisdictionId, scopes: [validatedPosition],
        applicant: { ...input, email: normalizedEmail, fullName: validatedFullName },
        justification: `Organization: ${input.organization}, Government level: ${input.governmentLevel}, LGA: ${input.lgaId}`,
        evidence, status: "pending", simulation: false,
      }], { session: transaction });
      return { user, profile, request };
    });
    stage = "post-commit";
    const userId = created.user._id;
    const officerProfile = created.profile;
    const accessRequest = created.request;

    // In-app notification is a side effect: it must never turn an already
    // stored PENDING request into a 500 for the applicant. Log and continue.
    try {
      await sendNotification(userId.toString(), {
        type: "approval",
        title: "Access Request Submitted",
        body: `Your officer access request has been submitted and is pending review. You will be notified once a decision is made.`,
        channel: "in_app",
        metadata: { accessRequestId: accessRequest._id.toString() },
      });
    } catch (notifyErr) {
      console.error(
        "[AccessRequest] Failed to send submission notification:",
        safeErrorCategory(notifyErr),
      );
    }


    // Notify authorized approvers through the existing notification service.
    // Fan-out is scoped server-side with the same grant + scope enforcement
    // as approve/reject decisions, so only approvers permitted to review this
    // request receive it. Side effect only: failures are logged and the
    // stored request is still returned with 201.
    try {
      const { findInScopeApproverUserIds } = await import(
        "@/server/actions/officer/access-requests"
      );
      const { Notification } = await import("@/server/models");
      const requestId = accessRequest._id.toString();
      const targetJurisdictionId =
        accessRequest.jurisdiction?.toString() ??
        officerProfile.jurisdiction?.toString() ??
        null;
      const approverUserIds = (
        await findInScopeApproverUserIds(targetJurisdictionId)
      ).filter((approverUserId) => approverUserId !== userId.toString());
      for (const approverUserId of approverUserIds) {
        try {
          // Idempotency guard: one notification per approver per request, so
          // a repeated submission of the same request never duplicates.
          const alreadyNotified = await Notification.findOne({
            user: approverUserId,
            type: "approval",
            "metadata.accessRequestId": requestId,
          })
            .select("_id")
            .lean();
          if (alreadyNotified) {
            continue;
          }
          await sendNotification(approverUserId, {
            type: "approval",
            title: "New Officer Access Request",
            body: `A new officer access request from ${validatedFullName} needs your review. Reference: ${requestId}.`,
            channel: "in_app",
            metadata: { accessRequestId: requestId, href: "/officer/approvals" },
          });
        } catch (perApproverErr) {
          console.error(
            "[AccessRequest] Failed to notify approver:",
            safeErrorCategory(perApproverErr),
          );
        }
      }
    } catch (approverNotifyErr) {
      console.error(
        "[AccessRequest] Failed to send approver notifications:",
        safeErrorCategory(approverNotifyErr),
      );
    }

    // Send submission confirmation email (non-blocking)
    let emailSent = false;
    try {
      const delivery = await sendSubmissionConfirmationEmail(
        normalizedEmail,
        validatedFullName,
        accessRequest._id.toString(),
      );
      emailSent = delivery.success;
      if (!emailSent) console.error("[officer.submission-email] Delivery unavailable; complete pending request retained.");
    } catch (emailErr) {
      console.error("[officer.submission-email]", safeErrorCategory(emailErr));
    }

    return NextResponse.json(
      {
        message: emailSent
          ? "Access request submitted successfully. You will be notified once it is reviewed."
          : "Access request submitted successfully. Confirmation email is currently unavailable. Use Check Approval Status to follow your request.",
        emailSent,

      },
      { status: 201 },
    );
  } catch (err) {
    // Schema paths/index names help diagnose failures without logging applicant data,
    // evidence, token hashes, connection strings or raw driver messages.
    const detail = err as { code?: unknown; keyPattern?: Record<string, unknown>; errors?: Record<string, { kind?: string }> } | null;
    console.error("[officer.access-request]", {
      stage, category: safeErrorCategory(err),
      code: typeof detail?.code === "number" ? detail.code : undefined,
      indexFields: detail?.keyPattern ? Object.keys(detail.keyPattern) : undefined,
      validationFields: detail?.errors ? Object.keys(detail.errors) : undefined,
    });
    // A concurrent submission can win the unique email race after the preflight.
    if (detail?.code === 11000 && detail.keyPattern?.email && submittedEmail) {
      return NextResponse.json({ message: "If you have already applied, use Check Approval Status. Existing accounts are not changed." }, { status: 202 });
    }
    return NextResponse.json(
      { error: "An error occurred while submitting your request." },
      { status: 500 },
    );
  }
}
