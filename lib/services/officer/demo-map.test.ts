import test from "node:test";
import assert from "node:assert/strict";
import { buildDemoMapZones } from "./demo-map";
import { DEFAULT_FILTERS } from "./map";
import { REFERENCE_STATES } from "./geography/reference";
import { centroidViewport, type OfficerMapScope } from "./map-scope";
import { resolveOfficerData } from "./data-mode";

const state = REFERENCE_STATES[0];
const lga = state.lgas[0];
const federal: OfficerMapScope = {
  level: "country",
  label: "Nigeria",
  stateId: "",
  lgaId: "",
  states: REFERENCE_STATES,
  viewport: centroidViewport(REFERENCE_STATES, 6),
};
const regional: OfficerMapScope = {
  ...federal,
  level: "state",
  label: state.name,
  stateId: state.id,
  states: [state],
};
const local: OfficerMapScope = {
  ...regional,
  level: "lga",
  label: lga.name,
  lgaId: lga.id,
  states: [{ ...state, lgas: [lga] }],
};

for (const scope of [federal, regional, local]) {
  test(`${scope.level}: all four categories, correct thresholds, administrative coordinates only`, () => {
    for (const timeRange of ["7d", "14d", "30d"] as const) {
      const zones = buildDemoMapZones({ ...DEFAULT_FILTERS, timeRange }, scope);
      assert.deepEqual(
        new Set(zones.map((zone) => zone.activityLevel)),
        new Set(["high", "moderate", "low", "none"]),
      );
      const locations =
        scope.level === "country"
          ? scope.states
          : scope.states.flatMap((item) => item.lgas);
      for (const zone of zones) {
        assert.equal(zone.source, "demo");
        assert.ok(zone.name.includes("Demo"));
        assert.ok(
          locations.some(
            (point) => point.lat === zone.lat && point.lng === zone.lng,
          ),
        );
        if (zone.activityLevel === "high") assert.ok(zone.reportCount >= 20);
        if (zone.activityLevel === "moderate")
          assert.ok(zone.reportCount >= 5 && zone.reportCount <= 19);
        if (zone.activityLevel === "low")
          assert.ok(zone.reportCount >= 1 && zone.reportCount <= 4);
        if (zone.suppressed) {
          assert.equal(zone.reportCount, 0); // Placeholder, never a hidden count.
          assert.equal(zone.topSymptom, null);
        }
        assert.equal(
          "citizen" in zone || "email" in zone || "phone" in zone,
          false,
        );
      }
    }
  });
}
test("demo geography rejects forged States, sibling LGAs, and mismatched pairs", () => {
  assert.throws(
    () =>
      buildDemoMapZones(
        { ...DEFAULT_FILTERS, stateId: REFERENCE_STATES[1].id },
        regional,
      ),
    /jurisdiction/,
  );
  assert.throws(
    () =>
      buildDemoMapZones(
        { ...DEFAULT_FILTERS, stateId: state.id, lgaId: state.lgas[1].id },
        local,
      ),
    /jurisdiction/,
  );
  assert.throws(
    () =>
      buildDemoMapZones(
        {
          ...DEFAULT_FILTERS,
          stateId: state.id,
          lgaId: REFERENCE_STATES[1].lgas[0].id,
        },
        federal,
      ),
    /jurisdiction/,
  );
});
test("filtering is deterministic and cannot return the other activity categories", () => {
  const filters = { ...DEFAULT_FILTERS, severity: "low" as const };
  const rows = buildDemoMapZones(filters, federal);
  assert.ok(rows.length);
  assert.ok(rows.every((row) => row.activityLevel === "low"));
  assert.deepEqual(rows, buildDemoMapZones(filters, federal));
});
test("Live failures never execute the demo fetcher", async () => {
  let demoCalls = 0;
  await assert.rejects(
    resolveOfficerData("live", {
      demo: async () => {
        demoCalls++;
        return [];
      },
      live: async () => {
        throw new Error("Unavailable");
      },
    }),
  );
  assert.equal(demoCalls, 0);
});
test("Demo fetches never execute the Live adapter", async () => {
  let liveCalls = 0;
  const rows = await resolveOfficerData("demo", {
    demo: async () => buildDemoMapZones(DEFAULT_FILTERS, federal),
    live: async () => {
      liveCalls++;
      return [];
    },
  });
  assert.ok(rows.length);
  assert.equal(liveCalls, 0);
});
