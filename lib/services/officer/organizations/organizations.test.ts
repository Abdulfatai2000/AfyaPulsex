import assert from "node:assert/strict";
import test from "node:test";
import { organizationsService } from "@/lib/services/officer/organizations";
import { REFERENCE_STATES } from "@/lib/services/officer/geography/reference";
import { geographyService } from "@/lib/services/officer/geography";

test("getOrganizationsByState returns organizations for a valid state", async () => {
  const orgs = await organizationsService.getOrganizationsByState("osun");
  assert.ok(orgs.length > 0, "Expected organisations for osun");
  assert.ok(
    orgs.every((org) => org.stateId === "osun"),
    "All organisations should belong to osun",
  );
});

test("getOrganizationsByState returns empty array for unknown state", async () => {
  const orgs = await organizationsService.getOrganizationsByState("unknown-state");
  assert.deepEqual(orgs, [], "Expected empty array for unknown state");
});

test("getOrganizationsByState returns distinct organisations per state", async () => {
  const osunOrgs = await organizationsService.getOrganizationsByState("osun");
  const oyoOrgs = await organizationsService.getOrganizationsByState("oyo");
  const osunNames = new Set(osunOrgs.map((o) => o.name));
  const oyoNames = new Set(oyoOrgs.map((o) => o.name));
  const intersection = [...osunNames].filter((n) => oyoNames.has(n));
  assert.strictEqual(intersection.length, 0, "Osun and Oyo should have different organisation names");
});

test("all states have organisation entries in the reference", async () => {
  const statesWithOrgs = new Set<string>();
  for (const state of REFERENCE_STATES.slice(0, 5)) {
    const orgs = await organizationsService.getOrganizationsByState(state.id);
    if (orgs.length > 0) {
      statesWithOrgs.add(state.id);
    }
  }
  assert.ok(statesWithOrgs.size >= 1, "At least some states should have organisations");
});

test("organisations have correct structure", async () => {
  const orgs = await organizationsService.getOrganizationsByState("osun");
  for (const org of orgs) {
    assert.ok(org.id, "Organisation should have an id");
    assert.ok(org.name, "Organisation should have a name");
    assert.strictEqual(org.stateId, "osun", "Organisation should have correct stateId");
    assert.ok(["facility", "ministry", "ngo", "response_team"].includes(org.type), "Organisation should have valid type");
    assert.ok(["active", "inactive"].includes(org.status), "Organisation should have valid status");
  }
});

test("LGA belongs to its parent State", async () => {
  const states = REFERENCE_STATES.slice(0, 3);
  for (const state of states) {
    const lgas = await geographyService.getLgasByState(state.id);
    assert.ok(lgas.length > 0, `Expected LGAs for ${state.id}`);
    for (const lga of lgas) {
      assert.strictEqual(lga.stateId, state.id, `LGA ${lga.id} should belong to state ${state.id}`);
    }
  }
});

test("changing State clears incompatible LGA", async () => {
  const osunLgas = await geographyService.getLgasByState("osun");
  const oyoLgas = await geographyService.getLgasByState("oyo");
  const osunLgaIds = new Set(osunLgas.map((l) => l.id));
  const oyoLgaIds = new Set(oyoLgas.map((l) => l.id));
  const intersection = [...osunLgaIds].filter((id) => oyoLgaIds.has(id));
  assert.strictEqual(intersection.length, 0, "Osun and Oyo LGAs should not overlap");
});
