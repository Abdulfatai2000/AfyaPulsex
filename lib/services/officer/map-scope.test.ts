import test from "node:test";
import assert from "node:assert/strict";
import { REFERENCE_STATES } from "./geography/reference";
import {
  centroidViewport,
  mapSelection,
  type OfficerMapScope,
} from "./map-scope";

const state = REFERENCE_STATES.find((item) => item.id === "osun")!;
const other = REFERENCE_STATES.find((item) => item.id !== state.id)!;
const lga = state.lgas[0];
const scope: OfficerMapScope = {
  level: "state",
  label: state.name,
  stateId: state.id,
  lgaId: "",
  states: [state],
  viewport: centroidViewport([state, ...state.lgas], 8),
};

test("State scope rejects forged State/LGA filters and defaults to its assigned State", () => {
  assert.equal(
    mapSelection(scope, { stateId: "", lgaId: "" }).state?.id,
    state.id,
  );
  assert.throws(
    () => mapSelection(scope, { stateId: other.id, lgaId: "" }),
    /jurisdiction/,
  );
  assert.throws(
    () => mapSelection(scope, { stateId: state.id, lgaId: other.lgas[0].id }),
    /jurisdiction/,
  );
  assert.equal(
    mapSelection(scope, { stateId: state.id, lgaId: lga.id }).lga?.id,
    lga.id,
  );
});
test("LGA scope cannot be widened by clearing filters or selecting a sibling", () => {
  const local = {
    ...scope,
    level: "lga" as const,
    lgaId: lga.id,
    states: [{ ...state, lgas: [lga] }],
  };
  assert.equal(mapSelection(local, { stateId: "", lgaId: "" }).lga?.id, lga.id);
  assert.throws(
    () => mapSelection(local, { stateId: state.id, lgaId: state.lgas[1].id }),
    /jurisdiction/,
  );
});
test("Federal scope permits its reference hierarchy but rejects mismatched State/LGA", () => {
  const federal = {
    ...scope,
    level: "country" as const,
    stateId: "",
    states: REFERENCE_STATES,
  };
  assert.equal(
    mapSelection(federal, { stateId: other.id, lgaId: other.lgas[0].id }).state
      ?.id,
    other.id,
  );
  assert.throws(
    () => mapSelection(federal, { stateId: state.id, lgaId: other.lgas[0].id }),
    /jurisdiction/,
  );
  assert.throws(
    () => mapSelection(federal, { stateId: "", lgaId: lga.id }),
    /jurisdiction/,
  );
});
test("Missing bounds use a real centroid; malformed coordinates never generate fake bounds", () => {
  const view = centroidViewport([lga, { lat: NaN, lng: Infinity }], 12);
  assert.deepEqual(view.center, [lga.lat, lga.lng]);
  assert.equal(view.bounds, null);
  assert.equal(view.exactBoundary, false);
  assert.throws(
    () => centroidViewport([{ lat: 95, lng: 0 }], 8),
    /coordinates/,
  );
});
