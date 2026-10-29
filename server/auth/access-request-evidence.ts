// Pure evidence validation for Officer Access Requests — DB-free so the
// rules can be unit-tested without touching the database.
//
// Contract mirrors the access-request form (AccessRequestForm.tsx):
// JPEG/PNG images and PDF documents, at most 5 MB. Both the submission
// endpoint and any future intake path must validate through
// `validateEvidenceFile` — never trust client-supplied type/size claims
// alone. Storage lives on the AccessRequest document itself; this module
// owns only the acceptance rules.
export const EVIDENCE_ALLOWED_MIME_TYPES: ReadonlyArray<string> = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];

export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;

export type EvidenceKind = "image" | "document";

export interface EvidenceFileInput {
  mimeType: string;
  size: number;
}

/**
 * Fail-closed validation of an uploaded evidence file. Returns an error
 * message when the file must be rejected, or null when it is acceptable.
 */
export function validateEvidenceFile(
  file: EvidenceFileInput | null | undefined,
): string | null {
  if (!file) {
    return "Evidence file is required.";
  }
  if (!EVIDENCE_ALLOWED_MIME_TYPES.includes(file.mimeType)) {
    return "Invalid file type. Allowed: JPG, PNG, PDF.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "Evidence file is empty.";
  }
  if (file.size > EVIDENCE_MAX_BYTES) {
    return "File exceeds 5MB limit.";
  }
  return null;
}

/**
 * Presentation kind for an accepted mime type: images render inline,
 * anything else accepted (PDF) opens as a document. Unknown types fall
 * back to document handling — never to inline rendering.
 */
export function classifyEvidenceKind(mimeType: string): EvidenceKind {
  return mimeType === "image/jpeg" ||
    mimeType === "image/jpg" ||
    mimeType === "image/png"
    ? "image"
    : "document";
}
