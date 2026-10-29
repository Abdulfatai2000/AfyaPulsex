import type { VitalReading } from "@/types/vitals";
export function readingValue(reading: VitalReading) {
  return (
    (reading.type === "blood_pressure"
      ? reading.value.systolic + " / " + reading.value.diastolic
      : reading.value) +
    " " +
    reading.unit
  );
}
// Explicit timezone keeps server/client output consistent; entry uses the device's local time.
export function readingTime(value: string) {
  return (
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }).format(new Date(value)) + " WAT"
  );
}
