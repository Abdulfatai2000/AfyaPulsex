import {
  Activity,
  CalendarDays,
  MapPin,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/server/lib/utils";
import type { InvestigationDetail } from "@/lib/services/officer/investigations";
import {
  CONFIDENCE_LABELS,
  formatInvestigationRange,
} from "@/lib/services/officer/investigations";
import { InvestigationTrendChart } from "./InvestigationTrendChart";
import { InvestigationActions } from "./InvestigationActions";

function SummaryTile({
  icon: Icon,
  label,
  value,
  subtext,
  emphasis,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subtext?: string;
  emphasis?: "elevated" | "neutral";
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {label}
      </div>
      <p
        className={cn(
          "mt-1.5 break-words text-base font-bold leading-tight text-deep-navy",
          emphasis === "elevated" && "text-danger-red/90",
        )}
      >
        {value}
      </p>
      {subtext ? (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {subtext}
        </p>
      ) : null}
    </div>
  );
}

function changeLabel(percent: number): string {
  return percent > 0 ? `+${percent}%` : `${percent}%`;
}

/**
 * Overview tab content for a single investigation — aggregate summary tiles,
 * the aggregate trend chart, and the Officer Actions panel. Reads only the
 * aggregate detail payload; performs no fetching of its own.
 */
export function InvestigationOverview({
  detail,
  onAddNote,
  onAssign,
  onEscalate,
  onMonitor,
  onClose,
}: {
  detail: InvestigationDetail;
  onAddNote: (body: string) => Promise<unknown>;
  onAssign: (team: string) => Promise<unknown>;
  onEscalate: () => Promise<unknown>;
  onMonitor: () => Promise<unknown>;
  onClose: () => Promise<unknown>;
}) {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <section className="min-w-0 rounded-xl border border-border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-deep-navy">
            Investigation summary
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Aggregate indicators for this investigation context.
          </p>
          <dl className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryTile
              icon={MapPin}
              label="Location"
              value={`${detail.lgaName} LGA`}
              subtext={detail.stateName}
            />
            <SummaryTile
              icon={CalendarDays}
              label="Time Window"
              value={formatInvestigationRange(
                detail.timeWindow.start,
                detail.timeWindow.end,
              )}
            />
            <SummaryTile
              icon={Activity}
              label="Total Reports"
              value={String(detail.totalReports)}
              subtext="aggregated over the reporting window"
            />
            <SummaryTile
              icon={TrendingUp}
              label="Change from Baseline"
              value={changeLabel(detail.changeFromBaselinePercent)}
              subtext="vs baseline over the same window"
              emphasis={detail.changeFromBaselinePercent > 0 ? "elevated" : "neutral"}
            />
            <SummaryTile
              icon={ShieldCheck}
              label="Confidence"
              value={CONFIDENCE_LABELS[detail.confidence]}
              subtext="aggregate signal quality"
            />
          </dl>
        </section>

        <InvestigationTrendChart points={detail.trend} />
      </div>

      <aside className="min-w-0">
        <InvestigationActions
          detail={detail}
          onAddNote={onAddNote}
          onAssign={onAssign}
          onEscalate={onEscalate}
          onMonitor={onMonitor}
          onClose={onClose}
        />
      </aside>
    </div>
  );
}