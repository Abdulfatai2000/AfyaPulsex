import { cn } from "@/server/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  HeartPulse,
  Send,
  type LucideIcon,
} from "lucide-react";
import type { ResponseStatus } from "@/lib/services/officer/response";
import { RESPONSE_STAGE_LABELS } from "@/lib/services/officer/response";

interface StatusConfig {
  label: string;
  className: string;
  Icon: LucideIcon;
}

/**
 * Response status is communicated by label + icon + color so it never depends
 * on color alone. Mirrors the StatusTag / badge pattern used across the
 * officer portal (investigations, warnings, explorer activities).
 */
const STATUS_CONFIG: Record<ResponseStatus, StatusConfig> = {
  directed: {
    label: RESPONSE_STAGE_LABELS.directed,
    className: "bg-primary-blue/10 text-primary-blue",
    Icon: Send,
  },
  reviewing: {
    label: RESPONSE_STAGE_LABELS.reviewing,
    className: "bg-warning-amber/10 text-warning-amber",
    Icon: Eye,
  },
  monitoring: {
    label: RESPONSE_STAGE_LABELS.monitoring,
    className: "bg-teal/10 text-teal",
    Icon: Activity,
  },
  escalated: {
    label: RESPONSE_STAGE_LABELS.escalated,
    className: "bg-danger-red/10 text-danger-red",
    Icon: AlertTriangle,
  },
  response: {
    label: RESPONSE_STAGE_LABELS.response,
    className: "bg-success-green/10 text-success-green",
    Icon: HeartPulse,
  },
  resolved: {
    label: RESPONSE_STAGE_LABELS.resolved,
    className: "bg-gray-100 text-gray-600",
    Icon: CheckCircle2,
  },
};

export function ResponseStatusBadge({
  status,
  className,
}: {
  status: ResponseStatus;
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