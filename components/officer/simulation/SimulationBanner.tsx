import { FlaskConical, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DEMO_WARNING } from "@/lib/services/officer/simulation";

/**
 * Prominent red/pink "Simulation Mode" banner. Introduces the page as a demo
 * surface and carries the hard privacy warning — all copy comes from the
 * simulation service constants so it never drifts from the boundary.
 */
export function SimulationBanner() {
  return (
    <section
      role="note"
      aria-label="Simulation mode notice"
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-danger-red/30 bg-danger-red/5 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="destructive"
          className="h-7 gap-1.5 px-3 text-xs font-semibold"
        >
          <FlaskConical className="size-3.5" aria-hidden="true" />
          Simulation Mode
        </Badge>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-danger-red">
          Demo environment
        </span>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-warning-amber/30 bg-warning-amber/10 px-3 py-2 text-xs font-medium leading-relaxed text-warning-amber">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{DEMO_WARNING}</span>
      </p>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Simulated runs stay isolated from production surveillance — demo
        signals never appear in the Signal Map, Signal Explorer, Analytics,
        Investigations, Public Health Alerts, or Reports.
      </p>
    </section>
  );
}