import type { ReportDraft } from "./report";
import type { VitalReading } from "./vitals";

/** History presentation contract reusing the report's field types, not a database model. */
export interface HealthEventRecord extends Pick<
  ReportDraft,
  "customSymptom" | "duration" | "notes"
> {
  id: string;
  symptoms: string[];
  severity: Exclude<ReportDraft["severity"], "">;
  bodyAreas?: string[];
  startedAt: string;
  createdAt: string;
  recurrence?: string;
  trigger?: string;
}
export interface MyHealthData {
  events: HealthEventRecord[];
  vitals: VitalReading[];
  /** Server-supplied reference time for consistent date windows. */
  asOf: string;
}
export type TimelineItem =
  | { kind: "event"; id: string; at: string; record: HealthEventRecord }
  | { kind: "vital"; id: string; at: string; record: VitalReading };
export interface HealthInsight {
  id: string;
  title: string;
  observation: string;
}
export type LoadMyHealth = () => Promise<MyHealthData>;
// TODO(DEV3): replace demo adapter with authenticated HealthEvent/VitalReading history.
// TODO(DEV3): provide pagination/date-range/trend-ready data; current counts describe loaded records only.
// TODO(DEV4): enforce ownership from the server session, never a browser-supplied userId.
// TODO(DEV4): provide an approved non-diagnostic insight endpoint and deterministic fallback.
