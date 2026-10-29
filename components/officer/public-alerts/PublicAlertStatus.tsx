import { cn } from "@/server/lib/utils";
import {
  CalendarX2,
  Eye,
  FilePenLine,
  Info,
  Megaphone,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type {
  PublicAlertLevel,
  PublicAlertStatus,
} from "@/lib/services/officer/public-alerts";
import {
  LEVEL_LABELS,
  STATUS_LABELS,
} from "@/lib/services/officer/public-alerts";

interface StatusConfig {
  label: string;
  className: string;
  Icon: LucideIcon;
}

/**
 * Public-alert status is communicated by label + icon + color so it never
 * depends on color alone. Mirrors the status badge pattern used across the
 * officer portal (investigations, responses, warnings).
 */
const STATUS_CONFIG: Record<PublicAlertStatus, StatusConfig> = {
  draft: {
    label: STATUS_LABELS.draft,
    className: "bg-gray-100 text-gray-600",
    Icon: FilePenLine,
  },
  "under-review": {
    label: STATUS_LABELS["under-review"],
    className: "bg-warning-amber/10 text-warning-amber",
    Icon: Eye,
  },
  published: {
    label: STATUS_LABELS.published,
    className: "bg-success-green/10 text-success-green",
    Icon: Megaphone,
  },
  expired: {
    label: STATUS_LABELS.expired,
    className: "bg-danger-red/10 text-danger-red",
    Icon: CalendarX2,
  },
};

export function PublicAlertStatusBadge({
  status,
  className,
}: {
  status: PublicAlertStatus;
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

interface UrgencyConfig {
  label: string;
  className: string;
  Icon: LucideIcon;
}

/**
 * Severity urgency signal: icon + text + tone so urgency never depends on
 * color alone. Critical/warning render the red danger signal; watch is amber;
 * info stays visually quiet (neutral, never red).
 */
const URGENCY_CONFIG: Record<PublicAlertLevel, UrgencyConfig> = {
  critical: {
    label: LEVEL_LABELS.critical,
    className: "border-danger-red/40 bg-danger-red/10 text-danger-red",
    Icon: TriangleAlert,
  },
  warning: {
    label: LEVEL_LABELS.warning,
    className: "border-danger-red/30 bg-danger-red/10 text-danger-red",
    Icon: TriangleAlert,
  },
  watch: {
    label: LEVEL_LABELS.watch,
    className:
      "border-warning-amber/30 bg-warning-amber/10 text-warning-amber",
    Icon: Eye,
  },
  info: {
    label: LEVEL_LABELS.info,
    className: "border-gray-200 bg-gray-50 text-gray-600",
    Icon: Info,
  },
};

export function PublicAlertUrgencySignal({
  level,
  className,
}: {
  level: PublicAlertLevel;
  className?: string;
}) {
  const { label, className: tone, Icon } = URGENCY_CONFIG[level];
  return (
    <span
      role="img"
      aria-label={`${label} severity alert`}
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
      <span className="sr-only">severity</span>
    </span>
  );
}