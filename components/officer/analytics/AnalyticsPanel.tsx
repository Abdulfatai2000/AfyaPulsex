import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * Shared white rounded panel for the Analytics workspace — consistent with the
 * rest of the Officer Portal (subtle border, rounded corners, compact header).
 */
export function AnalyticsPanel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-border bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-deep-navy">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("px-4 pb-4 pt-1", contentClassName)}>{children}</div>
    </section>
  );
}