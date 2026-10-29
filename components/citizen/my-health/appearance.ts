import {
  Activity,
  Brain,
  HeartPulse,
  Thermometer,
  Wind,
  PersonStanding,
  Droplets,
  Scale,
  type LucideIcon,
} from "lucide-react";
import type { TimelineItem } from "@/types/my-health";
export type RecordAppearance = {
  Icon: LucideIcon;
  tone: "rose" | "purple" | "amber" | "blue" | "green";
};
/** Decorative category colors, never severity or medical classifications. */
export function recordAppearance(item: TimelineItem): RecordAppearance {
  if (item.kind === "vital") {
    switch (item.record.type) {
      case "temperature":
        return { Icon: Thermometer, tone: "rose" };
      case "blood_pressure":
        return { Icon: HeartPulse, tone: "rose" };
      case "heart_rate":
        return { Icon: Activity, tone: "green" };
      case "spo2":
        return { Icon: Droplets, tone: "blue" };
      case "weight":
        return { Icon: Scale, tone: "amber" };
    }
  }
  const names = item.record.symptoms;
  if (names.includes("Fever")) return { Icon: Thermometer, tone: "rose" };
  if (names.includes("Cough") || names.includes("Difficulty Breathing"))
    return { Icon: Wind, tone: "purple" };
  if (names.includes("Headache")) return { Icon: Brain, tone: "amber" };
  if (
    names.includes("Body Pain") ||
    names.includes("Back Pain") ||
    names.includes("Joint Pain")
  )
    return { Icon: PersonStanding, tone: "purple" };
  return { Icon: HeartPulse, tone: "blue" };
}
