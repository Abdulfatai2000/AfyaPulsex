import "server-only";
import { accountRecordFilter } from "./account-environment";
import Groq from "groq-sdk";
import { requireCitizen } from "@/server/auth/rbac";
import { HealthEvent } from "@/server/models";
import { insightGuidance, personalInsightInput, selectPersonalInsight } from "./personal-insight-content";

// In-memory LRU-like cache keyed by citizen and report timestamp
const insightCache = new Map<string, {
  reportCount: number;
  latestReportDate: string | null;
  observation: string;
  guidance: string;
  source: "ai" | "fallback";
}>();

export async function getPersonalHealthInsight() {
  const session = await requireCitizen();
  const reports = await HealthEvent.find({ citizen: session.userId, ...await accountRecordFilter(session.userId) })
    .select("symptoms.name reportedAt").sort({ reportedAt: -1, _id: -1 }).limit(20).lean();
  if (!reports.length) return null;
  const { summary, observations } = personalInsightInput(reports);
  const reference = {
    reportCount: reports.length,
    latestReportDate: reports[0].reportedAt?.toISOString() ?? null,
  };
  const cacheKey = `${session.userId}:${reference.latestReportDate}:${reference.reportCount}`;
  const cached = insightCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const fallback = { ...reference, observation: observations[1] ?? observations[0], guidance: insightGuidance[1], source: "fallback" as const };
  if (session.user.isDemo || !process.env.GROQ_API_KEY?.trim()) return fallback;
  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 8000, maxRetries: 0 });
    const response = await client.chat.completions.create({
      model: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b",
      response_format: { type: "json_object" }, temperature: 0,
      max_completion_tokens: 1000,
      messages: [
        { role: "system", content: "Compose a private health-report insight by selecting the most relevant supplied observation and guidance. Return ONLY JSON with observation and guidance as zero-based integer indexes. Prefer a repeated symptom observation when available. Do not diagnose, infer disease, prescribe medication or add text. Only reporting patterns are supported." },
        { role: "user", content: JSON.stringify({ summary, observations, guidance: insightGuidance }) },
      ],
    });
    if (response.choices[0]?.finish_reason !== "stop") return fallback;
    const result = { ...reference, ...selectPersonalInsight(response.choices[0]?.message.content ?? "", observations), source: "ai" as const };
    // Bound memory cache to latest 200 sessions
    if (insightCache.size > 200) {
      const oldestKey = insightCache.keys().next().value;
      if (oldestKey) insightCache.delete(oldestKey);
    }
    insightCache.set(cacheKey, result);
    return result;
  } catch {
    // Never log provider errors: they can contain request data or credentials.
    return fallback;
  }
}
