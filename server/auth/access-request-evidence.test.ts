// Evidence acceptance-rule tests — pure logic, no database.
import assert from "node:assert/strict";
import test from "node:test";
import {
  EVIDENCE_MAX_BYTES,
  classifyEvidenceKind,
  validateEvidenceFile,
} from "@/server/auth/access-request-evidence";

test("accepts the form's evidence types within the size limit", () => {
  for (const mimeType of [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
  ]) {
    assert.equal(
      validateEvidenceFile({ mimeType, size: 1024 }),
      null,
      mimeType,
    );
  }
  assert.equal(
    validateEvidenceFile({ mimeType: "image/png", size: EVIDENCE_MAX_BYTES }),
    null,
  );
});

test("rejects missing, empty, wrong-type, and oversized evidence", () => {
  assert.match(
    validateEvidenceFile(null) ?? "",
    /Evidence file is required/,
  );
  assert.match(
    validateEvidenceFile({ mimeType: "image/png", size: 0 }) ?? "",
    /empty/,
  );
  assert.match(
    validateEvidenceFile({ mimeType: "application/zip", size: 1024 }) ?? "",
    /Invalid file type/,
  );
  assert.match(
    validateEvidenceFile({ mimeType: "text/html", size: 1024 }) ?? "",
    /Invalid file type/,
  );
  assert.match(
    validateEvidenceFile({
      mimeType: "application/pdf",
      size: EVIDENCE_MAX_BYTES + 1,
    }) ?? "",
    /exceeds 5MB/,
  );
});

test("classifies images for inline view and documents for open", () => {
  assert.equal(classifyEvidenceKind("image/jpeg"), "image");
  assert.equal(classifyEvidenceKind("image/png"), "image");
  assert.equal(classifyEvidenceKind("application/pdf"), "document");
  assert.equal(classifyEvidenceKind("application/octet-stream"), "document");
});
