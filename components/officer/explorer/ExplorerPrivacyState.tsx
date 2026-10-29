"use client";

import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-panel privacy state rendered when every aggregate group in scope falls
 * below the aggregation threshold. The suppression decision always comes from
 * the service payload (dataSufficiency), never inferred from counts in the UI.
 */
export function ExplorerPrivacyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-white p-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-amber/10">
        <ShieldAlert className="h-5 w-5 text-warning-amber" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-deep-navy">
        Insufficient aggregated data
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        The selected filters produced result buckets below the privacy
        aggregation threshold. Broaden your filters to reveal aggregated signal
        activity.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onReset}
        type="button"
        className="text-xs"
      >
        Reset filters
      </Button>
    </div>
  );
}