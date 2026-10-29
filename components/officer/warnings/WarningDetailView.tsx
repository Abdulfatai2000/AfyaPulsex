import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Clock,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/server/lib/utils";
import type { EarlyWarning } from "@/lib/services/officer/warnings";
import { formatUpdatedAt } from "./WarningCard";
import {
  WarningSeverityBadge,
  WarningStatusBadge,
} from "./WarningStatusBadge";

const CARD_CLASS = "rounded-xl border border-border bg-white shadow-sm";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-deep-navy">
        {value}
      </dd>
    </div>
  );
}

function IndicatorTile({
  icon: Icon,
  label,
  value,
  subtext,
  suppressed,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  subtext?: string;
  suppressed?: boolean;
}) {
  return (
    <div className={cn(CARD_CLASS, "p-4")}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {label}
      </div>
      {suppressed ? (
        <>
          <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-warning-amber">
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            Insufficient aggregated data
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Values are suppressed to protect privacy.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 break-words text-2xl font-bold leading-none text-deep-navy">
            {value}
          </p>
          {subtext ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {subtext}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Presentational detail view for a single aggregate warning. Reads the warning
 * payload passed in; it performs NO fetching or auth decisions itself.
 */
export function WarningDetailView({ warning }: { warning: EarlyWarning }) {
  const suppressed = warning.dataSufficiency === "insufficient";
  const hasEstimate = warning.elevatedEstimate != null;
  const hasCount = warning.signalCount != null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link
        href="/officer/warnings"
        className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-medium text-deep-navy outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary-blue/60"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        Back to Early Warning Center
      </Link>

      <header className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <WarningStatusBadge status={warning.status} />
          <WarningSeverityBadge severity={warning.severity} />
          {suppressed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-amber/10 px-2 py-0.5 text-xs font-medium text-warning-amber">
              <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
              Insufficient aggregated data
            </span>
          )}
        </div>

        <h2 className="min-w-0 text-xl font-bold leading-snug text-deep-navy sm:text-2xl">
          {warning.title}
        </h2>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            Reference:
            <code className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
              {warning.id}
            </code>
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Last updated{" "}
            <time dateTime={warning.lastUpdated}>
              {formatUpdatedAt(warning.lastUpdated)}
            </time>
          </span>
        </p>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <section className={cn(CARD_CLASS, "min-w-0 p-4 sm:p-5 lg:col-span-2")}>
          <h3 className="text-sm font-semibold text-deep-navy">
            Aggregate signal
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80 sm:text-[0.925rem]">
            {warning.signal}
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Aggregate, jurisdiction-level signal only — never a clinical
            diagnosis and never an individual health record.
          </p>
          {suppressed && warning.note && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-warning-amber/10 px-2.5 py-2 text-[11px] leading-relaxed text-warning-amber">
              <ShieldAlert
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              {warning.note}
            </p>
          )}
        </section>

        <section className={cn(CARD_CLASS, "min-w-0 p-4 sm:p-5")}>
          <h3 className="text-sm font-semibold text-deep-navy">
            Warning details
          </h3>
          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <DetailRow label="State" value={warning.state} />
            <DetailRow label="LGA" value={warning.lga} />
            <DetailRow label="Ward" value={warning.ward ?? "\u2014"} />
            <DetailRow label="Health condition" value={warning.healthCondition} />
            <DetailRow label="Lookback" value={`Last ${warning.windowDays} days`} />
            <DetailRow label="Time window" value={warning.timeWindow} />
          </dl>
        </section>
      </div>

      <section
        className={cn(CARD_CLASS, "min-w-0 p-4 sm:p-5")}
        aria-label="Aggregate indicators"
      >
        <h3 className="text-sm font-semibold text-deep-navy">Aggregate indicators</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Values below the privacy aggregation threshold are suppressed and
          never shown as zero.
        </p>
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <IndicatorTile
            icon={TrendingUp}
            label="Elevated estimate"
            value={hasEstimate ? `${warning.elevatedEstimate}%` : undefined}
            subtext={hasEstimate ? "above the recent baseline for this area" : undefined}
            suppressed={!hasEstimate}
          />
          <IndicatorTile
            icon={Activity}
            label="Aggregate signal count"
            value={hasCount ? String(warning.signalCount) : undefined}
            subtext={hasCount ? "signals within this lookback window" : undefined}
            suppressed={!hasCount}
          />
          <IndicatorTile
            icon={CalendarDays}
            label="Lookback window"
            value={`Last ${warning.windowDays} days`}
            subtext={warning.timeWindow}
          />
        </div>
      </section>

      <footer className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <p>
          Warning signals are aggregated across your jurisdiction. No citizen
          identities, addresses, or individual health records are shown here.
        </p>
      </footer>
    </div>
  );
}