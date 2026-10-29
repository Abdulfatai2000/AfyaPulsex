"use client";

import { Bookmark, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/server/lib/utils";
import type { SavedExplorerQuery } from "@/lib/services/officer/saved-queries";

interface Props {
  queries: SavedExplorerQuery[];
  loading?: boolean;
  /** Re-run a saved query: applies its filters and returns to Build Query. */
  onRun: (query: SavedExplorerQuery) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Saved Queries tab. Lists officer-authored Build Query filter sets; running
 * one loads its filters into the Build Query tab and re-searches. Empty until
 * a query is saved (the store is seeded so the tab is usable in the mock).
 */
export function ExplorerSavedQueries({
  queries,
  loading = false,
  onRun,
  onDelete,
}: Props) {
  if (loading) {
    return (
      <div
        className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4"
        aria-label="Loading saved queries"
        aria-busy="true"
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <EmptyState
        title="No saved queries"
        description="Build a search in the Build Query tab and save it to re-run it here later."
      />
    );
  }

  return (
    <div className="min-w-0 rounded-xl border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-deep-navy">
          <Bookmark className="h-4 w-4 text-primary-blue" aria-hidden="true" />
          Saved queries
        </h3>
        <p className="text-xs text-muted-foreground">
          {queries.length} saved
        </p>
      </div>

      <ul className="flex flex-col gap-3 p-3">
        {queries.map((query) => (
          <li
            key={query.id}
            className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-off-white p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-deep-navy">
                {query.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {query.description}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                Saved {formatDate(query.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                className={cn("text-xs")}
                onClick={() => onRun(query)}
                type="button"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Run
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-gray-500"
                onClick={() => onDelete(query.id)}
                type="button"
                aria-label={`Delete saved query ${query.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}