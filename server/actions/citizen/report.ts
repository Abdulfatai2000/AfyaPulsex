// Dev 3 owns this file. Citizen report boundary — persists the ReportDraft the
// report flow submits, mapping its form fields onto the HealthEvent schema.
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireCitizen } from "@/server/auth/rbac";
import { reportHealthEvent } from "@/server/services/health-events";
import { getCitizenProfile } from "@/server/services/citizen-profile";
import { hasActiveConsent } from "@/server/services/consent";
import { docIdString } from "@/server/lib/id-utils";
import type { HealthEvent } from "@/server/models";
import type { ReportDraft } from "@/types/report";

const draftSchema = z.object({
  symptoms: z.array(z.string().trim().min(1)).min(1),
  customSymptom: z.string().optional(),
  bodyArea: z.string().trim().optional(),
  severity: z.union([z.literal(""), z.number().int().min(1).max(10)]),
  startDate: z.string(),
  startTime: z.string(),
  duration: z
    .enum(["<1h", "1-6h", "6-24h", "1-3d", "4-7d", "1w+"])
    .or(z.literal("")),
  notes: z.string().max(4000).optional(),
  details: z.string().max(4000).default(""),
});

function resolveOnsetAt(date: string, time: string): Date | undefined {
  if (!date || !time) return undefined;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export interface ReportSubmissionResult {
  ok: true;
  id: string;
  submittedAt: string;
  consentActive: boolean;
}

export async function submitReportAction(
  draft: ReportDraft,
): Promise<ReportSubmissionResult> {
  const session = await requireCitizen();
  const userId = session.user?.id;
  if (!userId) throw new Error("Authenticated citizen required");

  const parsed = draftSchema.parse(draft);
  const severity = parsed.severity === "" ? 5 : parsed.severity;
  const customSymptom = parsed.customSymptom?.trim() ?? "";
  const symptoms = [
    ...parsed.symptoms,
    ...(customSymptom ? [customSymptom] : []),
  ].map((name) => ({ name, severity }));

  const profile = await getCitizenProfile(userId);
  const notes = [parsed.notes?.trim(), parsed.details.trim()]
    .filter(Boolean)
    .join("\n") || undefined;

  const input: Partial<HealthEvent> = {
    jurisdiction: profile?.jurisdiction
      ? (profile.jurisdiction.toString() as never)
      : undefined,
    symptoms: symptoms as never,
    maxSeverity: severity,
    onsetAt: resolveOnsetAt(parsed.startDate, parsed.startTime),
    duration: parsed.duration || undefined,
    bodyArea: parsed.bodyArea
      ? parsed.bodyArea
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : undefined,
    notes,
  };

  const event = await reportHealthEvent(userId, input);
  revalidatePath("/dashboard");
  revalidatePath("/my-health");

  let consentActive = false;
  try {
    consentActive = await hasActiveConsent(userId, "communityContribution");
  } catch {
    // Dev 4 owns the consent service stub; treat as unavailable for now.
    consentActive = false;
  }

  return {
    ok: true,
    id: docIdString(event),
    submittedAt: new Date().toISOString(),
    consentActive,
  };
}
