import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { type Timeframe } from "@/lib/services/officer/dashboard";
import { DEFAULT_FILTERS, type MapZone } from "@/lib/services/officer/map";
import {
  resolveOfficerData,
  type OfficerDataMode,
} from "@/lib/services/officer/data-mode";
import { getOfficerDemoMapAction } from "@/server/actions/officer/demo-data";
import { getMapDataLive } from "@/lib/services/officer/live-adapters";
import { getOfficerMapContext } from "@/server/services/officer-map-scope";
import { MapPreviewClient } from "./MapPreviewClient";

interface Props {
  timeframe: Timeframe;
  mode: OfficerDataMode;
}

export default async function HealthActivityMapPreview({
  timeframe,
  mode,
}: Props) {
  const { scope } = await getOfficerMapContext();
  let zones: MapZone[] = [];
  let unavailable = false;
  try {
    const filters = {
      ...DEFAULT_FILTERS,
      stateId: scope.stateId,
      lgaId: scope.lgaId,
      timeRange: timeframe,
    };
    zones = await resolveOfficerData(mode, {
      demo: () => getOfficerDemoMapAction(filters),
      live: () => getMapDataLive(filters),
    });
  } catch {
    unavailable = true;
  }
  const summary = {
    jurisdiction: scope.label,
    highCount: zones.filter((zone) => zone.activityLevel === "high").length,
    moderateCount: zones.filter((zone) => zone.activityLevel === "moderate")
      .length,
    lowCount: zones.filter((zone) => zone.activityLevel === "low").length,
  };
  const isEmpty = zones.length === 0;

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h2 className="text-sm font-semibold text-[#08214A]">
            Health Activity Map
          </h2>
          <p className="text-xs text-gray-400">{summary.jurisdiction}</p>
        </div>
        <Link
          href="/officer/map"
          className="flex items-center gap-1 text-xs text-[#1267E8] font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1267E8] rounded"
          aria-label="View full signal map"
        >
          View Full Map <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div
          className="relative w-full h-[280px] rounded-lg overflow-hidden mb-3"
          aria-label={
            isEmpty
              ? "No mapped activity for this period"
              : `Map preview showing ${summary.highCount} high, ${summary.moderateCount} moderate, and ${summary.lowCount} low activity zones in ${summary.jurisdiction}`
          }
        >
          <MapPreviewClient
            zones={zones}
            viewport={scope.viewport}
            dataMode={mode}
          />
        </div>

        {(unavailable || isEmpty) && (
          <p role="status" className="mb-3 text-gray-500">
            {unavailable
              ? "Aggregate signals are temporarily unavailable."
              : "No publishable aggregate signals for this period. Data may be absent or privacy-protected."}
          </p>
        )}
        {!scope.viewport.exactBoundary && (
          <p className="mb-3 text-gray-500">
            Reference viewport; boundary data unavailable. Panning is disabled.
          </p>
        )}
        {mode === "demo" && (
          <p className="mb-3 text-gray-500">
            Synthetic aggregate examples at administrative centers; not real
            surveillance observations.
          </p>
        )}
        {/* Legend */}
        <div
          className="flex flex-wrap items-center gap-4 text-xs text-gray-600"
          role="list"
          aria-label="Map legend"
        >
          <div className="flex items-center gap-1" role="listitem">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#C63C3C] inline-block"
              aria-hidden="true"
            />
            <span>High ({summary.highCount})</span>
          </div>
          <div className="flex items-center gap-1" role="listitem">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#D99000] inline-block"
              aria-hidden="true"
            />
            <span>Moderate ({summary.moderateCount})</span>
          </div>
          <div className="flex items-center gap-1" role="listitem">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#20BFD0] inline-block"
              aria-hidden="true"
            />
            <span>Low ({summary.lowCount})</span>
          </div>
          <div className="flex items-center gap-1" role="listitem">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF] inline-block"
              aria-hidden="true"
            />
            <span>Insufficient</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
