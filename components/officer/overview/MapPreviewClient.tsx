"use client";

import type { OfficerDataMode } from "@/lib/services/officer/data-mode";
import type { MapViewport } from "@/lib/services/officer/map-scope";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { MapZone } from "@/lib/services/officer/map";

const SignalMap = dynamic(
  () =>
    import("@/components/officer/map/SignalMap").then((mod) => mod.SignalMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 animate-pulse">
        <p className="text-xs text-gray-400">Loading map...</p>
      </div>
    ),
  },
);

export function MapPreviewClient({
  zones,
  viewport,
  dataMode,
}: {
  zones: MapZone[];
  viewport: MapViewport;
  dataMode: OfficerDataMode;
}) {
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);

  return (
    <div className="h-full w-full">
      <SignalMap
        dataMode={dataMode}
        viewport={viewport}
        zones={zones}
        selectedZone={selectedZone}
        onSelect={setSelectedZone}
      />
    </div>
  );
}
