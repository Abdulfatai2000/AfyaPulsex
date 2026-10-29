import { REFERENCE_STATES } from "../geography/reference";
import type { GovernmentLevel } from "@/lib/validation/validators";
import type { Organization } from "./types";

/** UI authority types, not a registry of verified institutions or an access grant. */
export function surveillanceAuthorities(level: GovernmentLevel | "", stateId: string, lgaId = ""): Organization[] {
  const state = REFERENCE_STATES.find(item => item.id === stateId);
  if (!state || !level) return [];
  const entry = (id: string, name: string): Organization => ({ id, name, stateId: state.id, type: "ministry", status: "active" });
  if (level === "local") {
    const lga = state.lgas.find(item => item.id === lgaId && item.stateId === state.id);
    return lga ? [entry(`${state.id}:${lga.id}:surveillance`, `${lga.name}, ${state.name} — LGA Disease Surveillance & Notification / Public Health Unit`)] : [];
  }
  if (level === "state") {
    return [entry(`${state.id}:surveillance`, `${state.name} — ${state.id === "fct" ? "Territory Health Authority" : "Ministry of Health"} / Epidemiology & Surveillance Unit`)];
  }
  return [entry(`federal:${state.id}:public-health`, "Federal / National public-health authority")];
}
