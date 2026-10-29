"use client";

import type { MapZone } from "@/lib/services/officer/map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, MapPin, BarChart2 } from "lucide-react";

const ACTIVITY_LABEL: Record<string, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
  none: "Insufficient",
};

const ACTIVITY_COLOR: Record<string, string> = {
  high: "#C63C3C",
  moderate: "#D99000",
  low: "#20BFD0",
  none: "#9CA3AF",
};

interface Props {
  selectedZone: MapZone | null;
  jurisdiction: string;
}

export function MapSummaryPanel({ selectedZone, jurisdiction }: Props) {
  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-[#08214A]">
          Selected area
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-xs text-gray-500">{jurisdiction}</p>

        {!selectedZone && (
          <p className="mt-2 text-xs text-gray-500">
            Click a zone on the map to see details.
          </p>
        )}

        {selectedZone?.source === "demo" && (
          <p className="mt-2 text-gray-500">
            Demo aggregate example ? not real Citizen data.
          </p>
        )}
        {selectedZone && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-[#08214A]" />
              <span className="text-xs font-medium text-[#08214A]">
                {selectedZone.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="h-3 w-3 text-gray-500" />
                <span className="text-gray-500">Reports</span>
                <span className="col-span-2 text-[#08214A]">
                  {selectedZone.suppressed
                    ? "Withheld"
                    : selectedZone.reportCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity
                  className="h-3 w-3"
                  style={{ color: ACTIVITY_COLOR[selectedZone.activityLevel] }}
                />
                <span className="text-gray-500">Activity</span>
                <span className="col-span-2 text-[#08214A]">
                  {ACTIVITY_LABEL[selectedZone.activityLevel]}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-gray-500" />
                <span className="text-gray-500">Top symptom</span>
                <span className="col-span-2 text-[#08214A]">
                  {selectedZone.topSymptom ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-gray-500" />
                <span className="text-gray-500">Zone radius</span>
                <span className="col-span-2 text-[#08214A]">
                  {selectedZone.radius.toFixed(1)} km
                </span>
              </div>
            </div>

            {selectedZone.suppressed && (
              <p className="text-[10px] text-[#D99000]">
                Below privacy threshold — counts suppressed.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
