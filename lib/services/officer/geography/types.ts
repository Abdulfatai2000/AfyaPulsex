/**
 * Geography domain types (Officer Portal).
 *
 * The geographic hierarchy is explicit: every LGA carries its parent State id
 * (`stateId`); an LGA's State is NEVER inferred by searching display names.
 */

export interface GeographyLga {
  /** Stable unique LGA id (slug), e.g. "ibadan-north". */
  id: string;
  /** Stable official code, e.g. "NG031016". */
  code: string;
  /** Display name, e.g. "Ibadan North". */
  name: string;
  /** Parent State id - the single source of LGA -> State membership. */
  stateId: string;
  /** Administrative centroid (public reference data, never citizen data). */
  lat: number;
  lng: number;
}

export interface GeographyState {
  /** Stable unique State id (slug), e.g. "oyo". */
  id: string;
  /** Stable official code, e.g. "NG031". */
  code: string;
  /** Display name, e.g. "Oyo State" (or "FCT" for the capital territory). */
  name: string;
  /** Administrative centroid (public reference data, never citizen data). */
  lat: number;
  lng: number;
  /** Every LGA that belongs to this State. */
  lgas: readonly GeographyLga[];
}

/**
 * The geography a given officer session may access. In dev the mock returns
 * the full reference set; production must scope this from the authenticated
 * session - the backend/auth layer remains authoritative.
 */
export interface AuthorizedGeography {
  states: readonly GeographyState[];
}