import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { EarlyWarning } from "@/lib/services/officer/warnings";

/**
 * Action for a single warning. Links to the existing warning detail route —
 * the detail page itself is owned elsewhere and intentionally not touched.
 */
export function WarningActions({ warning }: { warning: EarlyWarning }) {
  const isActionable =
    warning.status === "new" || warning.status === "requires-review";
  const label = isActionable ? "Review" : "View";

  return (
    <Link
      href={`/officer/warnings/${warning.id}`}
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium whitespace-nowrap text-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`${label} warning: ${warning.title}`}
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}