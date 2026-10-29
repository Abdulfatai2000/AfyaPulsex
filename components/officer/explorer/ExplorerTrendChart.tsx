"use client";

import type { ExplorerTrendPoint } from "@/lib/services/officer/explorer";
import { cn } from "@/server/lib/utils";

/**
 * Accessible aggregate trend chart: labeled bars with a screen-reader text
 * fallback. Elevation is conveyed by label AND color, never color alone, and
 * suppressed periods are shown as short neutral bars with a "insufficient"
 * reading instead of fabricated counts.
 */
export function ExplorerTrendChart({ trend }: { trend: ExplorerTrendPoint[] }) {
  const max = Math.max(1, ...trend.map((p) => p.count ?? 0));
  const hasSuppressed = trend.some((p) => p.count === null);

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-deep-navy">Signal trend</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Aggregate signals over the selected window
      </p>

      <ul
        className="mt-3 flex h-32 items-end gap-1"
        aria-label="Aggregate signal trend by period"
      >
        {trend.map((point) => {
          const pct =
            point.count === null
              ? 3
              : Math.max(6, Math.round((point.count / max) * 100));
          return (
            <li
              key={point.label}
              className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
              aria-label={`${point.label}: ${point.count === null ? "insufficient data" : `${point.count} aggregate signals`}`}
            >
              <div
                className={cn(
                  "w-full rounded-t-sm",
                  point.count === null
                    ? "h-1 bg-gray-200"
                    : point.elevated
                      ? "bg-danger-red/80"
                      : "bg-primary-blue/70",
                )}
                style={point.count === null ? undefined : { height: `${pct}%` }}
              />
              <span className="hidden truncate text-center text-[9px] leading-tight text-gray-400 sm:block">
                {point.label}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary-blue/70" aria-hidden="true" />
          In range
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-danger-red/80" aria-hidden="true" />
          Above baseline
        </span>
        {hasSuppressed && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-200" aria-hidden="true" />
            &lt; privacy threshold
          </span>
        )}
      </div>
    </section>
  );
}