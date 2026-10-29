import { ArrowRight, FileSearch, HeartPulse, Settings2, UserRound } from "lucide-react";
import { cn } from "@/server/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  NotificationCategory,
  OfficerNotification,
} from "@/lib/services/officer/notifications";

const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; Icon: typeof HeartPulse; containerClass: string }
> = {
  "access-request": {
    label: "Access Request",
    Icon: UserRound,
    containerClass: "bg-primary-blue/10 text-primary-blue",
  },
  "health-signal": {
    label: "Health Signal",
    Icon: HeartPulse,
    containerClass: "bg-danger-red/10 text-danger-red",
  },
  investigation: {
    label: "Investigation",
    Icon: FileSearch,
    containerClass: "bg-[#D99000]/10 text-[#D99000]",
  },
  system: {
    label: "System",
    Icon: Settings2,
    containerClass: "bg-gray-100 text-gray-500",
  },
};

const KIND_LABEL: Record<OfficerNotification["kind"], string> = {
  urgent: "Urgent",
  warning: "Warning",
  info: "Info",
};

const KIND_CLASS: Record<OfficerNotification["kind"], string> = {
  urgent: "bg-danger-red/10 text-danger-red",
  warning: "bg-[#D99000]/10 text-[#D99000]",
  info: "bg-teal/10 text-teal",
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  notification: OfficerNotification;
  /** Opens the notification's own destination after marking it read. */
  onAction: (notification: OfficerNotification) => void;
}

/**
 * Single notification row for the Notifications / Alerts Center. Renders
 * aggregate, officer-facing descriptive text only; navigation targets come
 * from the notification itself — never hardcoded here.
 */
export function NotificationItem({ notification, onAction }: Props) {
  const { Icon, label, containerClass } = CATEGORY_META[notification.category];

  return (
    <li
      className={cn(
        "grid min-w-0 grid-cols-[auto_1fr_auto] items-start gap-3 p-4",
        "border-b border-gray-100 last:border-b-0",
        notification.unread
          ? "border-l-2 border-l-primary-blue bg-blue-50/40"
          : "border-l-2 border-l-transparent",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          containerClass,
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={cn(
              "min-w-0 text-sm",
              notification.unread
                ? "font-semibold text-deep-navy"
                : "font-medium text-gray-600",
            )}
          >
            {notification.title}
          </p>
          {notification.unread ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary-blue">
              <span
                className="size-1.5 rounded-full bg-primary-blue"
                aria-hidden="true"
              />
              Unread
            </span>
          ) : (
            <span className="text-[10px] font-medium text-muted-foreground">
              Read
            </span>
          )}
        </div>

        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {notification.description}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
              KIND_CLASS[notification.kind],
            )}
          >
            {KIND_LABEL[notification.kind]}
          </span>
          <time dateTime={notification.timestamp}>
            {formatTimestamp(notification.timestamp)}
          </time>
          <span className="hidden text-gray-400 sm:inline">·</span>
          <span className="hidden text-gray-500 sm:inline">
            {label}
          </span>
        </div>
      </div>

      <Button
        size="sm"
        variant={notification.unread ? "default" : "outline"}
        onClick={() => onAction(notification)}
        type="button"
        aria-label={`${notification.actionLabel} ${notification.title}`}
        className="shrink-0"
      >
        {notification.actionLabel}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Button>
    </li>
  );
}