import "server-only";
import Groq from "groq-sdk";
import { z } from "zod";
import { AggregatedSignal, EarlyWarning, Jurisdiction } from "@/server/models";
import { connectDB } from "@/server/db/connection";
import { currentPattern } from "./signals";
import { INSUFFICIENT_AGGREGATED_DATA } from "./privacy-policy";

export class AlertPipelineError extends Error {}

// Strict allowlist: neither internal warning text nor raw report text is used as a prompt.
export const patternSchema = z
  .object({
    state: z.string().min(1).max(120),
    lga: z.string().max(120).nullable(),
    periodStart: z.iso.datetime(),
    periodEnd: z.iso.datetime(),
    metric: z.literal("symptom_volume"),
    reportCount: z.number().int().positive(),
    baselineCount: z.number().int().positive(),
    trendSummary: z.literal(
      "Reported activity is above the preceding equal-length window; requires review.",
    ),
  })
  .strict();
export type AlertPattern = z.infer<typeof patternSchema>;

const plainText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) => !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),
      "Plain text required",
    );
export const alertDraftSchema = z
  .object({ title: plainText(120), body: plainText(1000) })
  .strict();

export function validateDraft(content: string) {
  try {
    const draft = alertDraftSchema.parse(JSON.parse(content));
    // Conservative lexical backstop; human review remains mandatory for all generated copy.
    if (
      /\b(outbreak|epidemic|pandemic|diagnos\w*|confirmed|caused by|treatment|medication|antibiotic|dosage|cure|malaria|cholera|typhoid|covid)\b|\d|https?:|@/i.test(
        `${draft.title} ${draft.body}`,
      )
    )
      throw new Error("Unsafe generated copy");
    return draft;
  } catch {
    throw new AlertPipelineError(
      "Groq returned an invalid or unsafe draft. Nothing was saved. Please retry or author a draft manually.",
    );
  }
}

export async function patternForWarning(
  warningId: string,
  jurisdictionIds: string[],
) {
  await connectDB();
  const warning = await EarlyWarning.findOne({
    _id: warningId,
    jurisdiction: { $in: jurisdictionIds },
    simulation: { $ne: true },
    status: { $in: ["draft", "active"] },
  }).lean();
  if (!warning?.signal)
    throw new AlertPipelineError(
      "Warning unavailable in your approved jurisdiction.",
    );
  const signal = await AggregatedSignal.findOne({
    _id: warning.signal,
    jurisdiction: warning.jurisdiction,
    metric: "symptom_volume",
    isAnomaly: true,
    simulation: { $ne: true },
  }).lean();
  if (!signal)
    throw new AlertPipelineError(
      "No detected aggregate pattern is available for this warning.",
    );
  const comparison = await currentPattern(
    String(warning.jurisdiction),
    signal.periodStart,
    signal.periodEnd,
  );
  if (!comparison) throw new AlertPipelineError(INSUFFICIENT_AGGREGATED_DATA);
  const area = await Jurisdiction.findById(warning.jurisdiction).lean();
  const state =
    area?.level === "state"
      ? area
      : area?.level === "lga"
        ? await Jurisdiction.findById(area.parent).lean()
        : null;
  if (!area || state?.level !== "state")
    throw new AlertPipelineError("A valid State/LGA is required.");
  const payload = patternSchema.parse({
    state: state.name,
    lga: area.level === "lga" ? area.name : null,
    periodStart: signal.periodStart.toISOString(),
    periodEnd: signal.periodEnd.toISOString(),
    metric: "symptom_volume",
    reportCount: comparison.current.reports,
    baselineCount: comparison.baseline.reports,
    trendSummary:
      "Reported activity is above the preceding equal-length window; requires review.",
  });
  return { warning, payload };
}

/** Server-only generation. This function cannot publish or choose geography/authority/status. */
export async function generateInsight(input: AlertPattern) {
  const payload = patternSchema.parse(input);
  if (!process.env.GROQ_API_KEY?.trim())
    throw new AlertPipelineError(
      "AI drafting is unavailable: GROQ_API_KEY is not configured on the server.",
    );
  let content: string | null | undefined;
  try {
    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: 20000,
      maxRetries: 0,
    });
    const response = await client.chat.completions.create({
      model: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b",
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_completion_tokens: 1800,
      messages: [
        {
          role: "system",
          content:
            "Return ONLY a JSON object with exactly title (max 120 chars) and body (max 1000 chars), both plain text. Write a cautious public-health DRAFT from an already detected increase in aggregate health reporting. State that reported activity is above the recent baseline and requires review. The data is evidence of reporting activity only. Do not infer a disease, cause, certainty, or a clinical conclusion. Do not use the words outbreak, epidemic, pandemic, diagnosis, confirmed, treatment, medication or cure. No treatment instructions, names, identities, authority claims, URLs, HTML or numeric statistics (do not reproduce the counts or dates). No invented facts. Keep the message short and neutral. Officer review and explicit publication will happen separately.",
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });
    if (response.choices[0]?.finish_reason !== "stop")
      throw new Error("Incomplete response");
    content = response.choices[0]?.message.content;
  } catch {
    // Provider errors can contain credentials/request data. Never forward/log them.
    throw new AlertPipelineError(
      "Groq could not generate a draft (timeout or provider failure). Nothing was published. Please try again.",
    );
  }
  return validateDraft(content ?? "");
}
