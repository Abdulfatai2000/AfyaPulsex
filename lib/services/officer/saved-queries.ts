/**
 * Officer Signal Explorer - saved-explorer-query store (client mock).
 *
 * The Explorer's "Saved Queries" tab keeps officer-authored filter sets so a
 * Build Query search can be re-run without rebuilding the form. This is a
 * presentation store only: query filter sets, no records, no citizen data.
 *
 * Persistence is a client-local mock (localStorage) until Dev 3 wires the
 * authorized server boundary:
 *
 * TODO(DEV3): Replace the localStorage store with the real saved-query API.
 *   The shape below is the contract (id, name, description, filters,
 *   createdAt).
 * TODO(DEV4): Enforce which saved queries an authenticated officer may see or
 *   run server-side, and require authorization at the server entry point.
 */

import type { ExplorerFilters } from "./explorer";

export interface SavedExplorerQuery {
  id: string;
  /** Officer-chosen name, e.g. "Ife Central - elevated signals". */
  name: string;
  /** Human summary of the scope, e.g. "Osun State · Ife Central · Last 7 days". */
  description: string;
  filters: ExplorerFilters;
  createdAt: string;
}

const STORAGE_KEY = "afyapulse.saved-explorer-queries.v1";

function defaultDescription(filters: ExplorerFilters): string {
  const range =
    filters.timeRange === "7d"
      ? "Last 7 days"
      : filters.timeRange === "14d"
        ? "Last 14 days"
        : "Last 30 days";
  const area = filters.lgaId ? filters.lgaId : filters.stateId;
  return `${area} · ${range}`;
}

/** Dev seed rows so the Saved Queries tab is usable before a save exists. */
const SEED_QUERIES: SavedExplorerQuery[] = [
  {
    id: "seed-elevated-ifecentral",
    name: "Ife Central - elevated signals",
    description: "Ife Central · Last 7 days",
    filters: { compareWith: "none", stateId: "osun", lgaId: "ife-central", symptom: "Fever", healthCondition: "", ageGroup: "all", sex: "all", timeRange: "7d", severity: "all", reportType: "all" },
    createdAt: "2026-01-12T09:00:00.000Z",
  },
  {
    id: "seed-high-30d",
    name: "High severity - 30 days",
    description: "Osun State · Last 30 days",
    filters: { compareWith: "previous-period", stateId: "osun", lgaId: "", symptom: "", healthCondition: "", ageGroup: "all", sex: "all", timeRange: "30d", severity: "high", reportType: "all" },
    createdAt: "2026-01-18T14:30:00.000Z",
  },
];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

type StoreScope = { accountId: string; isDemo: boolean };
function storageKey(scope: StoreScope) { return `${STORAGE_KEY}:${scope.accountId}`; }
function readStore(scope: StoreScope): SavedExplorerQuery[] {
  if (!isBrowser()) {
    return scope.isDemo ? structuredClone(SEED_QUERIES) : [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (raw) {
      const parsed = JSON.parse(raw) as SavedExplorerQuery[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Corrupt store is treated as empty; the seed replaces it below.
  }

  return scope.isDemo ? structuredClone(SEED_QUERIES) : [];
}

function writeStore(queries: SavedExplorerQuery[], scope: StoreScope): void {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(storageKey(scope), JSON.stringify(queries));
}

/** List saved explorer queries, most recently saved first. */
export function listSavedQueries(scope: StoreScope): SavedExplorerQuery[] {
  return [...readStore(scope)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Persist a query filter set for later re-runs. */
export function saveExplorerQuery(input: {
  name: string;
  description?: string;
  filters: ExplorerFilters;
}, scope: StoreScope): SavedExplorerQuery {
  const query: SavedExplorerQuery = {
    id: `query-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim() || "Untitled query",
    description: input.description?.trim() || defaultDescription(input.filters),
    filters: { ...input.filters },
    createdAt: new Date().toISOString(),
  };
  const queries = readStore(scope);
  queries.push(query);
  writeStore(queries, scope);
  return query;
}

/** Delete a saved query by id. */
export function deleteSavedQuery(id: string, scope: StoreScope): void {
  writeStore(readStore(scope).filter((query) => query.id !== id), scope);
}