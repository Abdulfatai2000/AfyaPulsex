// Approval-authority decision tests — pure logic, no database.
// Verifies: ordinary approved officers (incl. DSO/DSNO designations, which
// never appear in this input) cannot approve; state approvers are confined
// to their state; federal approvers hold national scope; everything
// unknown/legacy fails closed.
import assert from "node:assert/strict";
import test from "node:test";
import {
  decideApprovalAccess,
  denialMessage,
  normalizeApprovalScope,
} from "@/server/auth/approval-authority";

const OSUN = "68f1a2b3c4d5e6f708192a3b";
const OSUN_LGA = "68f1a2b3c4d5e6f708192a99";
const OYO = "68f1a2b3c4d5e6f708192a77";

// Normal approved officer: explicit grant absent → cannot approve.
test("ordinary approved officer without grant cannot approve", () => {
  const d = decideApprovalAccess({
    canApproveOfficerAccess: false,
    approvalScope: null,
    approverJurisdictionId: OSUN,
    targetJurisdictionId: OSUN,
    targetInApproverSubtree: true,
  });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, "no-grant");
});

// Grant flag without a scope → denied (not inferable).
test("grant flag without scope cannot approve", () => {
  const d = decideApprovalAccess({
    canApproveOfficerAccess: true,
    approvalScope: null,
    approverJurisdictionId: OSUN,
    targetJurisdictionId: OSUN,
    targetInApproverSubtree: true,
  });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, "no-scope");
});

// State approver: same state allowed.
test("state approver can approve request within their state", () => {
  const d = decideApprovalAccess({
    canApproveOfficerAccess: true,
    approvalScope: "state",
    approverJurisdictionId: OSUN,
    targetJurisdictionId: OSUN_LGA,
    targetInApproverSubtree: true,
  });
  assert.equal(d.allowed, true);
});

// State approver: other state denied.
test("state approver cannot approve request outside their state", () => {
  const d = decideApprovalAccess({
    canApproveOfficerAccess: true,
    approvalScope: "state",
    approverJurisdictionId: OSUN,
    targetJurisdictionId: OYO,
    targetInApproverSubtree: false,
  });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, "outside-scope");
  assert.match(denialMessage(d), /outside your authorized approval scope/);
});

// State approver: missing jurisdiction data fails closed.
test("state approver denied when jurisdiction cannot be proven in-scope", () => {
  const d = decideApprovalAccess({
    canApproveOfficerAccess: true,
    approvalScope: "state",
    approverJurisdictionId: OSUN,
    targetJurisdictionId: null,
    targetInApproverSubtree: false,
  });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, "outside-scope");
});

// Federal approver: national scope, including jurisdiction-less requests.
test("federal approver can approve any request (national scope)", () => {
  for (const target of [OYO, OSUN_LGA, null]) {
    const d = decideApprovalAccess({
      canApproveOfficerAccess: true,
      approvalScope: "federal",
      approverJurisdictionId: null,
      targetJurisdictionId: target,
      targetInApproverSubtree: false,
    });
    assert.equal(d.allowed, true, `target ${target}`);
  }
});

// Legacy/unknown scope values fail closed.
test("legacy and unknown scope values are denied", () => {
  assert.equal(normalizeApprovalScope("FEDERAL"), null);
  assert.equal(normalizeApprovalScope("STATE"), null);
  assert.equal(normalizeApprovalScope("LOCAL"), null);
  assert.equal(normalizeApprovalScope(""), null);
  assert.equal(normalizeApprovalScope(undefined), null);
  assert.equal(normalizeApprovalScope("federal"), "federal");
  assert.equal(normalizeApprovalScope("state"), "state");
  const d = decideApprovalAccess({
    canApproveOfficerAccess: true,
    approvalScope: normalizeApprovalScope("STATE"),
    approverJurisdictionId: OSUN,
    targetJurisdictionId: OSUN,
    targetInApproverSubtree: true,
  });
  assert.equal(d.allowed, false);
});

// Denial messages distinguish grant vs scope failures.
test("grant failures report permission-denied behavior", () => {
  assert.match(
    denialMessage({ allowed: false, reason: "no-grant" }),
    /do not have approval authority/,
  );
});
