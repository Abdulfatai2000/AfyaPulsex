import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { cn } from "@/server/lib/utils";
import type { ResponseDetail } from "@/lib/services/officer/response";
import { formatResponseDate } from "@/lib/services/officer/response";
import { ResponseStatusBadge } from "./ResponseStatusBadge";
import { ResponseWorkflow } from "./ResponseWorkflow";
import { ResponseTimeline } from "./ResponseTimeline";
import { ResponseActionForm } from "./ResponseActionForm";

export function ResponseDetailView({
  detail,
  onAdvance,
  onReassign,
  onAddNote,
}: {
  detail: ResponseDetail;
  onAdvance: () => Promise<unknown>;
  onReassign: (officer: string) => Promise<unknown>;
  onAddNote: (body: string) => Promise<unknown>;
}) {
  const meta = [
    {
      label: "Location",
      value: `${detail.lgaName} LGA · ${detail.stateName}`,
      icon: MapPin,
    },
    {
      label: "Assigned officer",
      value: detail.assignedTo,
      icon: UserRoundCheck,
    },
    {
      label: "Directed on",
      value: formatResponseDate(detail.directedOn),
      icon: CalendarDays,
    },
    {
      label: "Last updated",
      value: formatResponseDate(detail.lastUpdated),
      icon: CalendarDays,
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 items-center gap-2 border-b border-gray-100 pb-3">
        <Link
          href="/officer/response"
          className="inline-flex h-7 w-fit items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Back to Responses
        </Link>
        <span
          className="ml-auto rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold tabular-nums text-gray-600"
          aria-label="Response reference"
        >
          {detail.key}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="min-w-0 text-lg font-bold leading-snug text-deep-navy">
            {detail.title}
          </h2>
          <ResponseStatusBadge status={detail.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {detail.signal}
          <span className="text-gray-400"> · {detail.lgaName} LGA · {detail.stateName}</span>
        </p>
      </div>

      <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {meta.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "flex items-start gap-2 rounded-xl border border-border bg-white px-3 py-3 shadow-sm",
              )}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-blue/10 text-primary-blue"
                aria-hidden="true"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="mt-0.5 break-words text-xs font-medium text-deep-navy">
                  {item.value}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>

      <ResponseWorkflow counts={null} current={detail.status} />

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <ResponseTimeline events={detail.timeline} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <ResponseActionForm
            detail={detail}
            onAdvance={onAdvance}
            onReassign={onReassign}
            onAddNote={onAddNote}
          />
        </div>
      </div>

      <p
        role="note"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-relaxed text-gray-400"
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" />
        Aggregate, authorized operational details only — never individual citizen
        records. Privacy and consent boundaries remain enforced at the server
        entry point (DEV4).
      </p>
    </div>
  );
}