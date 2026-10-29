import { cn } from "@/server/lib/utils";
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Eye,
  HeartPulse,
  Send,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import type {
  ResponseStageFilter,
  ResponseStatus,
  ResponseSummaryCounts,
} from "@/lib/services/officer/response";
import { RESPONSE_STAGES } from "@/lib/services/officer/response";

interface StageVisual {
  Icon: LucideIcon;
  tone: string;
  activeTone: string;
}

const STAGE_VISUALS: Record<ResponseStatus, StageVisual> = {
  directed: {
    Icon: Send,
    tone: "bg-primary-blue/10 text-primary-blue",
    activeTone: "bg-primary-blue text-white",
  },
  reviewing: {
    Icon: Eye,
    tone: "bg-warning-amber/10 text-warning-amber",
    activeTone: "bg-warning-amber text-white",
  },
  monitoring: {
    Icon: Activity,
    tone: "bg-teal/10 text-teal",
    activeTone: "bg-teal text-white",
  },
  escalated: {
    Icon: AlertTriangle,
    tone: "bg-danger-red/10 text-danger-red",
    activeTone: "bg-danger-red text-white",
  },
  response: {
    Icon: HeartPulse,
    tone: "bg-success-green/10 text-success-green",
    activeTone: "bg-success-green text-white",
  },
  resolved: {
    Icon: CheckCircle2,
    tone: "bg-gray-100 text-gray-600",
    activeTone: "bg-gray-700 text-white",
  },
};

interface Props {
  /** Per-stage counts derived from the response service. Null while loading. */
  counts: ResponseSummaryCounts | null;
  /**
   * Filter mode: the currently selected stage ("all" shows every stage).
   * Requires `onSelect`.
   */
  selected?: ResponseStageFilter;
  onSelect?: (stage: ResponseStageFilter) => void;
  /**
   * Steps mode (detail view): the response's current live stage. Stages before
   * it render as complete, the current stage is highlighted, and later stages
   * stay upcoming. Ignores `selected`/`onSelect`.
   */
  current?: ResponseStatus;
  className?: string;
}

/**
 * The response workflow tracker — Directed → Reviewing → Monitoring →
 * Escalated → Response → Resolved. In the list it is a live filter over the
 * table; on the detail page it renders the response's position as a step
 * tracker. Counts come from the response service — never hardcoded.
 */
export function ResponseWorkflow({
  counts,
  selected,
  onSelect,
  current,
  className,
}: Props) {
  const stepsMode = current !== undefined;
  const currentIndex = stepsMode
    ? RESPONSE_STAGES.findIndex((stage) => stage.value === current)
    : -1;

  return (
    <section
      className={cn("min-w-0 rounded-xl border border-border bg-white shadow-sm", className)}
      aria-label="Response workflow"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-deep-navy">
          <SlidersHorizontal
            className="h-4 w-4 shrink-0 text-primary-blue"
            aria-hidden="true"
          />
          Response Workflow
        </div>
        <p
          role="status"
          aria-live="polite"
          className="text-[11px] text-muted-foreground"
        >
          {counts
            ? stepsMode
              ? `Response currently at ${current}`
              : `${counts.total} ${counts.total === 1 ? "response" : "responses"} across all stages`
            : "Loading workflow counts"}
        </p>
      </header>

      <div className="overflow-x-auto px-4 py-4">
        <ol
          className="flex min-w-fit items-stretch gap-2"
          aria-label={
            stepsMode
              ? "Response workflow progress"
              : "Response workflow stages — select a stage to filter"
          }
        >
          {RESPONSE_STAGES.map((stage, index) => {
            const visual = STAGE_VISUALS[stage.value];
            const Icon = visual.Icon;
            const count = counts ? counts[stage.value] : null;
            const isSelected = !stepsMode && selected === stage.value;
            const isCurrent = stepsMode && index === currentIndex;
            const isComplete =
              stepsMode && currentIndex >= 0 && index < currentIndex;
            const interactive = onSelect !== undefined;

            const content = (
              <>
                <span
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    isCurrent || isSelected
                      ? visual.activeTone
                      : isComplete
                        ? "bg-success-green/10 text-success-green"
                        : visual.tone,
                  )}
                  aria-hidden="true"
                >
                  {isComplete ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0" />
                  )}
                </span>
                <span
                  className={cn(
                    "mt-2 block text-xs font-semibold",
                    isCurrent || isSelected
                      ? "text-deep-navy"
                      : isComplete
                        ? "text-teal"
                        : "text-gray-500",
                  )}
                >
                  {stage.label}
                </span>
                <span
                  className="mt-0.5 block text-[11px] leading-snug text-muted-foreground"
                  aria-hidden={stepsMode}
                >
                  {count === null
                    ? "…"
                    : stepsMode
                      ? stage.description
                      : `${count} ${count === 1 ? "response" : "responses"}`}
                </span>
                <span className="sr-only">
                  {stepsMode
                    ? isCurrent
                      ? "Current stage"
                      : isComplete
                        ? "Completed stage"
                        : "Upcoming stage"
                    : `${count} ${stage.label.toLowerCase()} response${count === 1 ? "" : "s"}`}
                </span>
              </>
            );

            return (
              <li key={stage.value} className="flex items-stretch gap-2">
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onSelect(stage.value)}
                    aria-pressed={isSelected}
                    aria-label={stepsMode ? undefined : `Filter by ${stage.label}`}
                    className={cn(
                      "flex w-32 flex-none flex-col items-center rounded-xl border px-2 py-3 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-blue/60",
                      isSelected
                        ? "border-primary-blue/50 bg-primary-blue/5 shadow-sm"
                        : "border-gray-200 bg-white hover:border-primary-blue/40 hover:bg-gray-50/60",
                    )}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "flex w-32 flex-none flex-col items-center rounded-xl border px-2 py-3 text-center",
                      isCurrent
                        ? "border-primary-blue/50 bg-primary-blue/5 shadow-sm"
                        : isComplete
                          ? "border-teal/30 bg-teal/5"
                          : "border-gray-200 bg-white",
                    )}
                  >
                    {content}
                  </div>
                )}
                {index < RESPONSE_STAGES.length - 1 ? (
                  <span
                    className="my-auto h-px w-6 flex-none bg-gray-200 sm:w-8"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}