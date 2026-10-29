import type { InvestigationDetail } from "@/lib/services/officer/investigations";
import { InvestigationTrendChart } from "./InvestigationTrendChart";

/**
 * Trends tab for a single investigation — the last-14-days aggregate chart
 * plus a short aggregate reading. Data comes from the investigation service;
 * nothing individual is ever represented here.
 */
export function InvestigationTrends({
  detail,
}: {
  detail: InvestigationDetail;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <InvestigationTrendChart points={detail.trend} />
      <p
        role="note"
        className="rounded-lg bg-white px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
      >
        Daily values are aggregate counts for the jurisdiction area. The
        baseline reflects the same area&apos;s recent history. Values below the
        privacy aggregation threshold are not shown, and individual reports are
        never exposed.
      </p>
    </div>
  );
}