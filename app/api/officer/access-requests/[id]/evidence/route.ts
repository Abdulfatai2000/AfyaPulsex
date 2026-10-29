import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { connectDB } from "@/server/db/connection";
import { AccessRequest, OfficerProfile } from "@/server/models";
import { isValidObjectId } from "mongoose";
import {
  NO_APPROVAL_AUTHORITY,
} from "@/server/auth/approval-authority";
import { requireApprovalAuthorityForRequest } from "@/server/actions/officer/access-requests";

/**
 * Serve an Officer Access Request's submitted evidence (Official ID /
 * Letter) to an authorized approver. Access is guarded server-side by the
 * exact same approval-authority enforcement as approve/reject decisions:
 * only an approver allowed to review that request receives the bytes.
 * Fail-closed: unauthenticated, unauthorized, missing, or evidenceless
 * requests never leak file contents, storage paths, or credentials.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !isValidObjectId(id)) {
    return NextResponse.json(
      { error: "Access request not found" },
      { status: 404 },
    );
  }

  await connectDB();

  // Hydrated (non-lean) read: Buffer paths come back as real Buffers,
  // so the exact submitted bytes are served without BSON conversion.
  const request = await AccessRequest.findById(id).select(
    "officer jurisdiction evidence",
  );
  if (!request) {
    return NextResponse.json(
      { error: "Access request not found" },
      { status: 404 },
    );
  }

  const targetJurisdictionId =
    request.jurisdiction?.toString() ??
    (
      await OfficerProfile.findById(request.officer)
        .select("jurisdiction")
        .lean()
    )?.jurisdiction?.toString() ??
    null;

  try {
    await requireApprovalAuthorityForRequest(
      session.user.id,
      targetJurisdictionId,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : NO_APPROVAL_AUTHORITY;
    return NextResponse.json({ error: message }, { status: 403 });
  }

  // Lean queries return BSON Binary for Buffer paths, so normalize to a
  // real byte array before serving. Never expose storage internals.
  const evidence = request.evidence as unknown as {
    fileName?: string;
    mimeType?: string;
    size?: number;
    data?: unknown;
  } | null;
  const bytes: Buffer | null = toEvidenceBytes(evidence?.data);
  if (!bytes || !evidence?.fileName || !evidence?.mimeType) {
    return NextResponse.json(
      { error: "No evidence was submitted with this request." },
      { status: 404 },
    );
  }

  const safeName = evidence.fileName.replace(/["\r\n]/g, "_");
  return new NextResponse(new Uint8Array(bytes) as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": evidence.mimeType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Normalize stored evidence bytes (Buffer, Uint8Array, or BSON Binary from
 * lean queries) to a Buffer. Returns null when no usable bytes exist.
 */
function toEvidenceBytes(data: unknown): Buffer | null {
  if (!data) {
    return null;
  }
  if (Buffer.isBuffer(data)) {
    return data.length > 0 ? data : null;
  }
  if (data instanceof Uint8Array) {
    return data.byteLength > 0 ? Buffer.from(data) : null;
  }
  if (typeof data === "object") {
    const record = data as { buffer?: unknown; length?: unknown };
    if (record.buffer instanceof Uint8Array) {
      return record.buffer.byteLength > 0
        ? Buffer.from(record.buffer)
        : null;
    }
    if (typeof record.length === "number" && record.length > 0) {
      try {
        const bytes = Buffer.from(data as unknown as ArrayLike<number>);
        return bytes.length > 0 ? bytes : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}
