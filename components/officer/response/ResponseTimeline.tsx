import { cn } from "@/server/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  HeartPulse,
  Send,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react";
import type {
  ResponseStatus,
  ResponseTimelineEvent,
} from "@/lib/services/officer/response";
import { formatResponseDateTime } from "@/lib/services/officer/response";

const STAGE_ICONS: Record<ResponseStatus, LucideIcon> = {
  directed: Send,
  reviewing: Eye,
  monitoring: Activity,
  escalated: AlertTriangle,
  response: HeartPulse,
  resolved: CheckCircle2,
};

const KIND_TONES: Record<ResponseTimelineEvent["kind"], string> = {
  status: "bg-primary-blue/10 text-primary-blue",
  reassignment: "bg-teal/10 text-teal",
  note: "bg-gray-100 text-gray-600",
};

function eventIcon(event: ResponseTimelineEvent): LucideIcon {
  if (event.kind === "status" && event.stage && STAGE_ICONS[event.stage]) {
    return STAGE_ICONS[event.stage];
  }
  if (event.kind === "reassignment") {
    return Users;
  }
  return StickyNote;
}

/**
 * Operational timeline for a single response — status transitions plus
 * reassignments and internal notes, newest first. Aggregate, authorized
 * information only.
 */
export function ResponseTimeline({
  events,
}: {
  events: ResponseTimelineEvent[];
}) {
  // Newest first; copies so we never mutate service data.
  const ordered = [...events].reverse();
  return (
    <section
      className="min-w-0 rounded-xl border border-border bg-white shadow-sm"
      aria-label="Response timeline"
    >
      <header className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-deep-navy">
        <StickyNote className="h-4 w-4 shrink-0 text-primary-blue" aria-hidden="true" />
        Activity Timeline
      </header>
      <ol className="flex flex-col gap-0 p-4">
        {ordered.map((event, index) => {
          const Icon = eventIcon(event);
          return (
            <li
              key={event.id}
              className="relative flex gap-3 pb-4 last:pb-0"
              aria-label={event.title}
            >
              {index < ordered.length - 1 ? (
                <span
                  className="absolute left-[13px] top-7 h-[calc(100%-24px)] w-px bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  "z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  KIND_TONES[event.kind],
                )}
                aria-hidden="true"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-sm font-semibold text-deep-navy">
                    {event.title}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    <time dateTime={event.at}>
                      {formatResponseDateTime(event.at)}
                    </time>
                  </p>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {event.description}
                </p>
                <p className="mt-1 text-[11px] font-medium text-teal">
                  Logged by {event.actor}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}