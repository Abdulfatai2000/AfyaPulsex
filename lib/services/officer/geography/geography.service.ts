import type {
  AuthorizedGeography,
  GeographyLga,
  GeographyState,
} from "./types";

/**
 * Geography service contract, consumed by the Signal Map (and reusable by
 * other Officer Portal features). The UI never imports the reference array
 * directly - it always resolves geography through these methods, so the dev
 * mock can later be swapped for an authenticated backend endpoint without
 * touching the Signal Map UI.
 */
export interface GeographyService {
  /** All resolvable States (dev: full reference; prod: authorized set). */
  getStates(): Promise<readonly GeographyState[]>;
  getStateById(id: string): Promise<GeographyState | null>;
  getStateByCode(code: string): Promise<GeographyState | null>;
  getStateByName(name: string): Promise<GeographyState | null>;
  getLgasByState(stateId: string): Promise<readonly GeographyLga[]>;
  getLgaById(lgaId: string): Promise<GeographyLga | null>;
  /** Resolve an LGA's parent State from its stored `stateId`. */
  getStateForLga(lgaId: string): Promise<GeographyState | null>;
  /** Geography visible to the current officer session. */
  getAuthorizedGeography(): Promise<AuthorizedGeography>;
}