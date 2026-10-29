// Dev 3 owns this file. Serializes server documents into the DTO shapes the
// citizen/officer UIs consume (types/* and lib/services/officer contracts).
import type { VitalReading as VitalReadingDoc } from "@/server/models";
import type { VitalReading } from "@/types/vitals";
import { docIdString } from "@/server/lib/id-utils";

const DEFAULT_UNITS: Record<
  "temperature" | "heart_rate" | "spo2" | "weight",
  "°C" | "BPM" | "%" | "kg"
> = {
  temperature: "°C",
  heart_rate: "BPM",
  spo2: "%",
  weight: "kg",
};

export function toVitalReadingDTO(doc: VitalReadingDoc): VitalReading {
  const id = docIdString(doc);
  const measuredAt = (doc.takenAt ?? new Date()).toISOString();
  const note = doc.notes ?? undefined;
  const type = doc.type as VitalReading["type"];

  switch (type) {
    case "blood_pressure":
      return {
        id,
        type,
        value: {
          systolic: doc.value?.systolic ?? 0,
          diastolic: doc.value?.diastolic ?? 0,
        },
        unit: "mmHg",
        measuredAt,
        note,
      };
    case "temperature": {
      const unit = (doc.unit ?? DEFAULT_UNITS.temperature) as "°C" | "°F";
      return { id, type, value: doc.value?.numeric ?? 0, unit, measuredAt, note };
    }
    case "heart_rate":
      return { id, type, value: doc.value?.numeric ?? 0, unit: "BPM", measuredAt, note };
    case "spo2":
      return { id, type, value: doc.value?.numeric ?? 0, unit: "%", measuredAt, note };
    case "weight": {
      const unit = (doc.unit ?? DEFAULT_UNITS.weight) as "kg" | "lb";
      return { id, type, value: doc.value?.numeric ?? 0, unit, measuredAt, note };
    }
    default:
      throw new Error(
        `Unsupported vital type for citizen DTO: ${String(doc.type)}`,
      );
  }
}