import { SYMPTOM_LIST } from "@/types/report";

type Report = { symptoms?: { name: string }[] };
export const insightGuidance = [
  "Keep recording how you feel so you can review changes over time.",
  "If symptoms persist or concern you, discuss your reports with a qualified healthcare professional.",
] as const;

/** No custom symptom text, notes, dates, identifiers or geography cross this boundary. */
export function personalInsightInput(reports: Report[]) {
  const symptoms = SYMPTOM_LIST.map(name => ({
    name,
    reports: reports.filter(report => report.symptoms?.some(item => item.name === name)).length,
  })).filter(item => item.reports > 0);
  const observations = [reports.length === 1
    ? "You have recorded one health report. More reports can help you review changes over time."
    : `You have recorded ${reports.length} recent health reports. These describe your reported experiences, not a diagnosis.`];
  for (const symptom of symptoms.filter(item => item.reports > 1)) {
    observations.push(`${symptom.name} appears in ${symptom.reports} of your ${reports.length} recent reports.`);
  }
  return { summary: { reportCount: reports.length, symptoms }, observations };
}

/** Never render arbitrary model text: select only grounded, safe copy. */
export function selectPersonalInsight(content: string, observations: string[]) {
  const choice = JSON.parse(content);
  if (!Number.isInteger(choice.observation) || !Number.isInteger(choice.guidance)
    || choice.observation < 0 || choice.observation >= observations.length
    || choice.guidance < 0 || choice.guidance >= insightGuidance.length) {
    throw new Error("Invalid insight selection");
  }
  return { observation: observations[choice.observation], guidance: insightGuidance[choice.guidance] };
}
