import { cn } from "@/server/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Flag,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type {
  InvestigationPriority,
  InvestigationStatus,
} from "@/lib/services/officer/investigations";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/services/officer/investigations";

interface StatusConfig {
  label: string;
  className: string;
  Icon: LucideIcon;
}

/**
 * Investigation status is communicated by label + icon + color so it never
 * depends on color alone. Mirrors the StatusTag pattern used across the
 * officer portal (warnings, explorer activities).
 */
const STATUS_CONFIG: Record<InvestigationStatus, StatusConfig> = {
  new: {
    label: STATUS_LABELS.new,
    className: "bg-primary-blue/10 text-primary-blue",
    Icon: Sparkles,
  },
  reviewing: {
    label: STATUS_LABELS.reviewing,
    className: "bg-warning-amber/10 text-warning-amber",
    Icon: Eye,
  },
  investigating: {
    label: STATUS_LABELS.investigating,
    className: "bg-primary-blue/10 text-primary-blue",
    Icon: Search,
  },
  monitoring: {
    label: STATUS_LABELS.monitoring,
    className: "bg-teal/10 text-teal",
    Icon: Activity,
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

export function InvestigationStatusBadge({
  status,
  className,
}: {
  status: InvestigationStatus;
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

const PRIORITY_CONFIG: Record<
  InvestigationPriority,
  { label: string; className: string; Icon: LucideIcon }
> = {
  high: {
    label: PRIORITY_LABELS.high,
    className: "bg-danger-red/10 text-danger-red",
    Icon: AlertTriangle,
  },
  medium: {
    label: PRIORITY_LABELS.medium,
    className: "bg-warning-amber/10 text-warning-amber",
    Icon: Flag,
  },
  low: {
    label: PRIORITY_LABELS.low,
    className: "bg-teal/10 text-teal",
    Icon: Flag,
  },
};

/** Priority is a labeled badge (icon + text + color) — never color alone. */
export function InvestigationPriorityBadge({
  priority,
  className,
}: {
  priority: InvestigationPriority;
  className?: string;
}) {
  const { label, className: tone, Icon } = PRIORITY_CONFIG[priority];
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