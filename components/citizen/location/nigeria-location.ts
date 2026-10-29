import { NIGERIA_STATES, NIGERIA_STATES_LGAS } from "@/lib/data/nigeria-states-lgas";

export interface NigeriaState {
  name: string;
  lgas: string[];
}

export function getNigeriaStates(): NigeriaState[] {
  return NIGERIA_STATES.map((state) => ({
    name: state,
    lgas: NIGERIA_STATES_LGAS[state] ?? [],
  }));
}

export function getLGAsForState(state: string): string[] {
  return NIGERIA_STATES_LGAS[state] ?? [];
}

export function isValidStateLgaCombination(state: string, lga: string): boolean {
  const lgas = NIGERIA_STATES_LGAS[state];
  if (!lgas) return false;
  return lgas.includes(lga);
}

export const NIGERIA_COUNTRY = "Nigeria";