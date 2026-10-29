"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LegendItem {
  color: string;
  label: string;
  sub?: string;
}

const ITEMS: LegendItem[] = [
  { color: "#C63C3C", label: "High activity", sub: "≥ 20 signals" },
  { color: "#D99000", label: "Moderate activity", sub: "5–19 signals" },
  { color: "#20BFD0", label: "Low activity", sub: "1–4 signals" },
  { color: "#9CA3AF", label: "Insufficient aggregated data", sub: "below privacy threshold" },
];

export function MapLegend() {
  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-[#08214A]">
          Activity legend
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pb-2">
        {ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-xs text-[#08214A]">{item.label}</span>
            {item.sub ? (
              <span className="text-xs text-gray-500">({item.sub})</span>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
