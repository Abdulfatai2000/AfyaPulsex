// Dev 3 owns this file. Citizen "my health" boundary — the personal record
// that the report/vitals flows contribute to.
"use server";
import { requireCitizen } from "@/server/auth/rbac";
import { listHealthEvents } from "@/server/services/health-events";
import { listVitalReadings } from "@/server/services/vitals";
import { getCitizenProfile } from "@/server/services/citizen-profile";
import { getHealthProfile } from "@/server/services/health-profile";
import { docIdString } from "@/server/lib/id-utils";
import type { HealthEvent } from "@/server/models";
import type { VitalReading as VitalReadingDoc } from "@/server/models";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export interface MyHealthDTO {
  symptomsThisMonth: number;
  vitalsThisQuarter: number;
  conditions: string[];
  medications: { name: string; dosage?: string; frequency?: string }[];
  allergies: string[];
  bloodType: string;
  heightCm: number | null;
  weightKg: number | null;
  bloodPressureSummary: string;
  notes: string[];
}

function toEventRecord(doc: HealthEvent) {
  return {
    id: docIdString(doc),
    symptoms: doc.symptoms.map((s) => s.name),
    customSymptom: "",
    severity: (doc.maxSeverity ?? 5) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
    duration: (doc.duration ?? "1-3d") as "<1h" | "1-6h" | "6-24h" | "1-3d" | "4-7d" | "1w+",
    bodyAreas: doc.bodyArea ?? [],
    notes: doc.notes ?? "",
    startedAt: doc.reportedAt?.toISOString() ?? new Date().toISOString(),
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
    recurrence: undefined,
    trigger: undefined,
  };
}

function toVitalRecord(doc: VitalReadingDoc) {
  const id = docIdString(doc);
  const measuredAt = (doc.takenAt ?? new Date()).toISOString();
  const note = doc.notes ?? undefined;
  const type = doc.type;

  switch (type) {
    case "blood_pressure":
      return {
        id,
        type,
        value: {
          systolic: doc.value?.systolic ?? 0,
          diastolic: doc.value?.diastolic ?? 0,
        },
        unit: "mmHg" as const,
        measuredAt,
        note,
      };
    case "temperature": {
      const unit = (doc.unit ?? "°C") as "°C" | "°F";
      return { id, type, value: doc.value?.numeric ?? 0, unit, measuredAt, note };
    }
    case "heart_rate":
      return { id, type, value: doc.value?.numeric ?? 0, unit: "BPM" as const, measuredAt, note };
    case "spo2":
      return { id, type, value: doc.value?.numeric ?? 0, unit: "%" as const, measuredAt, note };
    case "weight": {
      const unit = (doc.unit ?? "kg") as "kg" | "lb";
      return { id, type, value: doc.value?.numeric ?? 0, unit, measuredAt, note };
    }
    default:
      throw new Error(`Unsupported vital type: ${String(doc.type)}`);
  }
}

export async function getMyHealthAction(): Promise<MyHealthDTO> {
  const session = await requireCitizen();
  const userId = session.user?.id;
  if (!userId) throw new Error("Authenticated citizen required");

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const quarterAgo = new Date(now.getTime() - NINETY_DAYS_MS);

  const [profile, events, vitals] = await Promise.all([
    getCitizenProfile(userId),
    listHealthEvents(userId, { from: monthAgo }),
    listVitalReadings(userId, quarterAgo, now),
  ]);

  const healthProfile = profile
    ? await getHealthProfile(docIdString(profile))
    : null;

  const latestPressure = vitals
    .filter((v) => v.type === "blood_pressure")
    .sort((a, b) => (b.takenAt?.getTime() ?? 0) - (a.takenAt?.getTime() ?? 0))[0];

  return {
    symptomsThisMonth: events.length,
    vitalsThisQuarter: vitals.length,
    conditions: healthProfile?.chronicConditions ?? [],
    medications: (healthProfile?.medications ?? []).map((m) => ({
      name: m.name ?? "Unnamed",
      dosage: m.dosage ?? undefined,
      frequency: m.frequency ?? undefined,
    })),
    allergies: healthProfile?.allergies ?? [],
    bloodType: healthProfile?.bloodType ?? "unknown",
    heightCm: healthProfile?.heightCm ?? null,
    weightKg: healthProfile?.weightKg ?? null,
    bloodPressureSummary: latestPressure
      ? `${latestPressure.value?.systolic ?? "—"}/${latestPressure.value?.diastolic ?? "—"}`
      : "—",
    notes: events
      .map((e) => e.notes)
      .filter((n): n is string => Boolean(n)),
  };
}

export interface MyHealthDataDTO {
  events: ReturnType<typeof toEventRecord>[];
  vitals: ReturnType<typeof toVitalRecord>[];
  asOf: string;
}

export async function getMyHealthDataAction(): Promise<MyHealthDataDTO> {
  const session = await requireCitizen();
  const userId = session.user?.id;
  if (!userId) throw new Error("Authenticated citizen required");

  const now = new Date();
  const quarterAgo = new Date(now.getTime() - NINETY_DAYS_MS);

  const [events, vitals] = await Promise.all([
    listHealthEvents(userId, { from: quarterAgo }),
    listVitalReadings(userId, quarterAgo, now),
  ]);

  return {
    events: events.map(toEventRecord),
    vitals: vitals.map(toVitalRecord),
    asOf: now.toISOString(),
  };
}