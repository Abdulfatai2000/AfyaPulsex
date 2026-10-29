import { RefreshCw } from "lucide-react";
import { LIVE_DATA_ERROR_MESSAGE } from "@/lib/services/officer/data-mode";

/**
 * Consistent professional error state for officer data widgets when the
 * backing adapter fails (notably Live mode with no backend/database). Never
 * renders demo/sample data as a fallback.
 */
export function DataErrorPanel({
  message = LIVE_DATA_ERROR_MESSAGE,
  title = "Unable to load data",
}: {
  message?: string;
  title?: string;
}) {
  return (
    <div
      role="alert"
      className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-white p-6 text-center"
    >
      <RefreshCw className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-semibold text-deep-navy">{title}</p>
      <p className="max-w-md break-words text-xs text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
