"use client";

import { ChevronRight } from "lucide-react";
import type { VitalReading, VitalType } from "@/types/vitals";
import { vitalConfigs } from "./config";
import { readingTime, readingValue } from "./format";
const primary: VitalType[] = [
  "temperature",
  "blood_pressure",
  "heart_rate",
  "spo2",
];
export function LatestVitalsCards({
  readings = [],
  onRecord,
}: {
  readings?: VitalReading[];
  onRecord?: (type: VitalType) => void;
}) {
  return (
    <div className="vt-summary">
      {primary.map((type) => {
        const config = vitalConfigs[type];
        const reading = readings
          .filter((r) => r.type === type)
          .sort(
            (a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt),
          )[0];
        return (
          <section className="vt-card vt-vital" key={type}>
            <span className={"vt-icon vt-" + type}>
              <config.Icon aria-hidden="true" />
            </span>
            <h2>{config.label}</h2>
            <p className="vt-value">
              {reading ? readingValue(reading) : "No reading yet"}
            </p>
            <p className="vt-muted">Last checked</p>
            {reading ? (
              <time dateTime={reading.measuredAt}>
                {readingTime(reading.measuredAt)}
              </time>
            ) : (
              <p className="vt-muted">Record a measurement to get started.</p>
            )}
            <button
              type="button"
              className="vt-vital-action"
              onClick={() => onRecord?.(type)}
              aria-label={"Record " + config.label}
            >
              <ChevronRight aria-hidden="true" size={14} />
            </button>
          </section>
        );
      })}
    </div>
  );
}