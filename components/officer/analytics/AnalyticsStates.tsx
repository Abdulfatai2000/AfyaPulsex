import { RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton placeholder used inside an analytics panel while data loads. */
export function AnalyticsPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="flex flex-col gap-3"
      aria-label="Loading analytics"
      aria-busy="true"
    >
      <Skeleton className="h-52 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded-md" />
      ))}
    </div>
  );
}

/** Compact chart-area skeleton (used by chart-heavy panels). */
export function AnalyticsChartSkeleton() {
  return (
    <div
      className="flex h-52 w-full items-center justify-center rounded-lg bg-muted/40"
      aria-label="Loading chart"
      aria-busy="true"
    >
      <Skeleton className="h-40 w-[calc(100%-3rem)] rounded-lg" />
    </div>
  );
}

export function AnalyticsErrorState({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-off-white px-6 py-8 text-center"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-red/10">
        <RefreshCw className="h-5 w-5 text-danger-red" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold text-deep-navy">
          Unable to load analytics data
        </p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          {message ?? "A network or backend error occurred. Please try again."}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry} type="button" className="text-xs">
        Retry
      </Button>
    </div>
  );
}

export function AnalyticsEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-off-white px-6 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
        <Inbox className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold text-deep-navy">No data available</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}