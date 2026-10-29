// Dev 3 owns this file. Citizen vitals boundary — save + list readings in the
// exact VitalReading DTO shape the VitalsPage consumes.
"use server";
import { requireCitizen } from "@/server/auth/rbac";
import { listVitalReadings, recordVitalReading } from "@/server/services/vitals";
import { toVitalReadingDTO } from "@/server/actions/serializers";
import type { VitalDraft, VitalReading } from "@/types/vitals";

const VITALS_WINDOW_DAYS = 90;

function toServiceInput(draft: VitalDraft) {
  return {
    type: draft.type,
    value:
      typeof draft.value === "number"
        ? { numeric: draft.value }
        : {
            systolic: draft.value.systolic,
            diastolic: draft.value.diastolic,
          },
    unit: draft.unit,
    takenAt: new Date(draft.measuredAt),
    notes: draft.note,
    source: "manual" as const,
  };
}

export async function saveVitalAction(draft: VitalDraft): Promise<VitalReading[]> {
  const session = await requireCitizen();
  const userId = session.user?.id;
  if (!userId) throw new Error("Authenticated citizen required");

  await recordVitalReading(userId, toServiceInput(draft));

  const from = new Date(Date.now() - VITALS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const docs = await listVitalReadings(userId, from, new Date());
  return docs.map(toVitalReadingDTO);
}

export async function listVitalsAction(): Promise<VitalReading[]> {
  const session = await requireCitizen();
  const userId = session.user?.id;
  if (!userId) throw new Error("Authenticated citizen required");

  const from = new Date(Date.now() - VITALS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const docs = await listVitalReadings(userId, from, new Date());
  return docs.map(toVitalReadingDTO);
}