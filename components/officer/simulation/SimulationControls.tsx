import { Play, RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/server/lib/utils";
import { Button } from "@/components/ui/button";
import type { SimulationViewStatus } from "@/lib/services/officer/simulation";

interface SimulationControlsProps {
  status: SimulationViewStatus;
  canRun: boolean;
  onStart: () => void;
  onRetry: () => void;
}

/**
 * Primary simulation actions. Renders nothing when the officer may not run
 * simulations — the center then shows the permission-denied state instead.
 */
export function SimulationControls({
  status,
  canRun,
  onStart,
  onRetry,
}: SimulationControlsProps) {
  if (!canRun) {
    return null;
  }

  const isBusy = status === "starting" || status === "running";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      {status === "error" ? (
        <Button onClick={onRetry} type="button">
          <RefreshCw className="size-4" aria-hidden="true" />
          Retry
        </Button>
      ) : status === "completed" ? (
        <Button variant="outline" onClick={onStart} type="button">
          <RotateCcw className="size-4" aria-hidden="true" />
          Start New Simulation
        </Button>
      ) : (
        <Button
          onClick={onStart}
          disabled={isBusy}
          type="button"
          aria-label="Start health-event simulation"
          className={cn("px-6", isBusy && "opacity-70")}
        >
          {isBusy ? (
            <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
          {status === "starting"
            ? "Starting…"
            : status === "running"
              ? "Simulation running…"
              : "Start Simulation"}
        </Button>
      )}

      <p className={cn("text-xs", isBusy && "text-muted-foreground")}>
        {status === "starting"
          ? "Preparing a demo dataset…"
          : status === "running"
            ? "A demo run is in progress — the steps below update live."
            : status === "error"
              ? "Something went wrong. Retry the simulation, or refresh the page."
              : status === "completed"
                ? "Run finished — demo data only, review in the panel below."
                : "Starts a guided, four-step demo run. No real data is used."}
      </p>
    </div>
  );
}