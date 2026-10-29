import { cn } from "@/server/lib/utils";
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Eye,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { WarningSeverity, WarningStatus } from "@/lib/services/officer/warnings";
import { STATUS_LABELS, SEVERITY_LABELS } from "@/lib/services/officer/warnings";

interface StatusConfig {
  label: string;
  className: string;
  Icon: LucideIcon;
}

/**
 * Status is communicated by label + icon + color so it never depends on color
 * alone. Mirrors the StatusTag pattern used across the officer portal.
 */
const STATUS_CONFIG: Record<WarningStatus, StatusConfig> = {
  new: {
    label: STATUS_LABELS.new,
    className: "bg-primary-blue/10 text-primary-blue",
    Icon: Sparkles,
  },
  monitoring: {
    label: STATUS_LABELS.monitoring,
    className: "bg-teal/10 text-teal",
    Icon: Activity,
  },
  "requires-review": {
    label: STATUS_LABELS["requires-review"],
    className: "bg-warning-amber/10 text-warning-amber",
    Icon: Eye,
  },
  escalated: {
    label: STATUS_LABELS.escalated,
    className: "bg-danger-red/10 text-danger-red",
    Icon: AlertTriangle,
  },
  closed: {
    label: STATUS_LABELS.closed,
    className: "bg-success-green/10 text-success-green",
    Icon: CheckCircle2,
  },
};

export function WarningStatusBadge({
  status,
  className,
}: {
  status: WarningStatus;
  className?: string;
}) {
  const { label, className: tone, Icon } = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

const SEVERITY_CONFIG: Record<WarningSeverity, { label: string; dot: string }> = {
  high: { label: SEVERITY_LABELS.high, dot: "bg-danger-red" },
  moderate: { label: SEVERITY_LABELS.moderate, dot: "bg-warning-amber" },
  low: { label: SEVERITY_LABELS.low, dot: "bg-teal" },
};

/** Severity is shown as a coded dot plus an explicit text label. */
export function WarningSeverityBadge({
  severity,
  className,
}: {
  severity: WarningSeverity;
  className?: string;
}) {
  const { label, dot } = SEVERITY_CONFIG[severity];
  return (
    <span
      className={cn("inline-flex w-fit shrink-0 items-center gap-1.5 text-xs font-medium text-deep-navy", className)}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}