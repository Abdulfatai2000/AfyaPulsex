import { REFERENCE_STATES } from "./reference";
import type { GeographyService } from "./geography.service";
import type {
  AuthorizedGeography,
  GeographyLga,
  GeographyState,
} from "./types";

/**
 * Development geography adapter.
 *
 * Serves the full authoritative reference (36 states + FCT, 774 LGAs) from a
 * static module. No authentication is wired yet, so no geography is filtered
 * here - the backend/auth layer remains authoritative and will drive the
 * authorized subset in production (TODO DEV3/DEV4).
 */

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

interface GeographyIndexes {
  statesById: Map<string, GeographyState>;
  statesByCode: Map<string, GeographyState>;
  statesByName: Map<string, GeographyState>;
  lgasById: Map<string, GeographyLga>;
  lgasByState: Map<string, readonly GeographyLga[]>;
}

function buildIndexes(): GeographyIndexes {
  const statesById = new Map<string, GeographyState>();
  const statesByCode = new Map<string, GeographyState>();
  const statesByName = new Map<string, GeographyState>();
  const lgasById = new Map<string, GeographyLga>();
  const lgasByState = new Map<string, readonly GeographyLga[]>();

  for (const state of REFERENCE_STATES) {
    statesById.set(state.id, state);
    statesByCode.set(state.code, state);
    statesByName.set(state.name.toLowerCase(), state);
    lgasByState.set(state.id, state.lgas);
    for (const lga of state.lgas) {
      lgasById.set(lga.id, lga);
    }
  }

  return { statesById, statesByCode, statesByName, lgasById, lgasByState };
}

export function createMockGeographyService(): GeographyService {
  const { statesById, statesByCode, statesByName, lgasById, lgasByState } =
    buildIndexes();

  return {
    async getStates(): Promise<readonly GeographyState[]> {
      await delay(140);
      return REFERENCE_STATES;
    },
    async getStateById(id): Promise<GeographyState | null> {
      await delay(60);
      return statesById.get(id) ?? null;
    },
    async getStateByCode(code): Promise<GeographyState | null> {
      await delay(60);
      return statesByCode.get(code) ?? null;
    },
    async getStateByName(name): Promise<GeographyState | null> {
      await delay(60);
      return statesByName.get(name.toLowerCase()) ?? null;
    },
    async getLgasByState(stateId): Promise<readonly GeographyLga[]> {
      await delay(120);
      return lgasByState.get(stateId) ?? [];
    },
    async getLgaById(lgaId): Promise<GeographyLga | null> {
      await delay(60);
      return lgasById.get(lgaId) ?? null;
    },
    async getStateForLga(lgaId): Promise<GeographyState | null> {
      await delay(60);
      const lga = lgasById.get(lgaId);
      return lga ? (statesById.get(lga.stateId) ?? null) : null;
    },
    async getAuthorizedGeography(): Promise<AuthorizedGeography> {
      await delay(140);
      return { states: REFERENCE_STATES };
    },
  };
}

/** Shared instance used across the Officer Portal. */
export const geographyService: GeographyService = createMockGeographyService();