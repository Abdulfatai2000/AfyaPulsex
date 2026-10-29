import { cn } from "@/server/lib/utils";
import { Megaphone } from "lucide-react";
import type {
  PublicAlertChannel,
  PublicAlertLevel,
} from "@/lib/services/officer/public-alerts";
import { CHANNEL_LABELS, LEVEL_LABELS } from "@/lib/services/officer/public-alerts";

interface Props {
  title: string;
  /** "Ife Central LGA" or "Osun State". */
  areaLabel: string;
  level: PublicAlertLevel;
  body: string;
  channels: PublicAlertChannel[];
}

const LEVEL_TONES: Record<PublicAlertLevel, string> = {
  info: "bg-teal/10 text-teal",
  watch: "bg-warning-amber/10 text-warning-amber",
  warning: "bg-warning-amber/10 text-warning-amber",
  critical: "bg-danger-red/10 text-danger-red",
};

/**
 * Renders a public alert the way a resident would see it (aggregate,
 * public-health messaging only — never individual records). Used as a live
 * preview while an officer authors a new alert and as the detail header on the
 * alert view.
 */
export function PublicAlertPreview({
  title,
  areaLabel,
  level,
  body,
  channels,
}: Props) {
  const previewBody = body.trim() || "The message body goes here.";
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-deep-navy">
          <Megaphone className="h-3.5 w-3.5 text-primary-blue" aria-hidden="true" />
          AfyaPulse public alert preview
        </span>
        <span
          className={cn(
            "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            LEVEL_TONES[level],
          )}
        >
          {LEVEL_LABELS[level]}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold leading-snug text-deep-navy">
          {title.trim() || "Alert title"}
        </p>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
          {areaLabel}
        </p>
      </div>
      <p className="min-w-0 whitespace-pre-line break-words text-sm leading-relaxed text-gray-700">
        {previewBody}
      </p>
      {channels.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-200 pt-3">
          <span className="text-[11px] font-medium text-muted-foreground">
            Delivered via
          </span>
          {channels.map((channel) => (
            <span
              key={channel}
              className="inline-flex w-fit shrink-0 items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600"
            >
              {CHANNEL_LABELS[channel]}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}