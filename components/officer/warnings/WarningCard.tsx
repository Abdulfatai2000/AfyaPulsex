import Link from "next/link";
import { CalendarDays, Clock, MapPin, ShieldAlert, Stethoscope } from "lucide-react";
import type { EarlyWarning } from "@/lib/services/officer/warnings";
import { WarningActions } from "./WarningActions";
import { WarningSeverityBadge, WarningStatusBadge } from "./WarningStatusBadge";

export function formatWarningLocation(warning: EarlyWarning): string {
  return [warning.state, warning.lga, warning.ward].filter(Boolean).join(" · ");
}

export function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Mobile/tablet warning card — stacked presentation of a single warning. */
export function WarningCard({ warning }: { warning: EarlyWarning }) {
  const detailHref = `/officer/warnings/${warning.id}`;

  return (
    <article className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-semibold text-deep-navy">
          <Link
            href={detailHref}
            className="rounded outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/60 hover:underline"
          >
            {warning.title}
          </Link>
        </h3>
        <WarningStatusBadge status={warning.status} />
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {warning.signal}
      </p>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <dt className="sr-only">Location</dt>
          <dd className="truncate">{formatWarningLocation(warning)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <dt className="sr-only">Time window</dt>
          <dd>{warning.timeWindow}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Stethoscope className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <dt className="sr-only">Health condition</dt>
          <dd>{warning.healthCondition}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <dt className="sr-only">Last updated</dt>
          <dd>
            <time dateTime={warning.lastUpdated}>{formatUpdatedAt(warning.lastUpdated)}</time>
          </dd>
        </div>
      </dl>

      {warning.dataSufficiency === "insufficient" && warning.note && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-warning-amber/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-warning-amber">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {warning.note}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <WarningSeverityBadge severity={warning.severity} />
        <WarningActions warning={warning} />
      </div>
    </article>
  );
}