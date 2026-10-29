"use server";

import { z } from "zod";
import { getServerDataMode } from "@/lib/services/officer/data-mode-server";
import { getOfficerMapContext } from "@/server/services/officer-map-scope";
import {
  buildDemoMapZones,
  demoMapFiltersSchema,
} from "@/lib/services/officer/demo-map";
import { mapSelection } from "@/lib/services/officer/map-scope";
import type { MapFilters } from "@/lib/services/officer/map";
import {
  getExplorerData,
  type ExplorerFilters,
} from "@/lib/services/officer/explorer";
import { requireCapability } from "@/server/auth/rbac";

async function demoScope() {
  if ((await getServerDataMode()) !== "demo")
    throw new Error("Demo data is unavailable in Live Mode.");
  return (await getOfficerMapContext()).scope;
}

export async function getOfficerDemoMapAction(filters: MapFilters) {
  return buildDemoMapZones(filters, await demoScope());
}

export async function getOfficerDemoExplorerAction(input: ExplorerFilters) {
  await requireCapability("explorer:read", { allowDemo: true });
  const scope = await demoScope();
  const filters = demoMapFiltersSchema
    .extend({
      compareWith: z.enum(["none", "previous-period", "same-period-last-year"]),
    })
    .parse(input);
  const selected = mapSelection(scope, filters);
  // Explorer's existing demo contract is State/LGA based. Use the first
  // authorized State for an unselected Federal view, and return its scope label.
  const state = selected.state ?? scope.states[0];
  if (!state) throw new Error("No authorized demo geography is available.");
  return getExplorerData({
    ...filters,
    stateId: state.id,
    lgaId: selected.lga?.id ?? "",
  });
}
