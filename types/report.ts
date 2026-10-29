/** Frontend-only report drafting types. Not database schemas. */

export const SYMPTOM_LIST = [
  "Fever",
  "Fatigue",
  "Chills",
  "Weakness",
  "Dizziness",
  "Cough",
  "Difficulty Breathing",
  "Runny Nose",
  "Sore Throat",
  "Vomiting",
  "Diarrhea",
  "Nausea",
  "Appetite Changes",
  "Rash",
  "Itching",
  "Swelling",
  "Headache",
  "Chest Pain",
  "Abdominal Pain",
  "Back Pain",
  "Joint Pain",
  "Body Pain",
] as const;

export type Symptom = (typeof SYMPTOM_LIST)[number];

export const BODY_AREA_RELEVANT_SYMPTOMS: readonly Symptom[] = [
  "Headache",
  "Chest Pain",
  "Abdominal Pain",
  "Back Pain",
  "Joint Pain",
  "Body Pain",
  "Rash",
  "Itching",
  "Swelling",
] as const;

export function isBodyAreaRelevant(symptom: Symptom): boolean {
  return BODY_AREA_RELEVANT_SYMPTOMS.includes(symptom);
}

export function hasBodyAreaRelevant(symptoms: readonly Symptom[]): boolean {
  return symptoms.some(isBodyAreaRelevant);
}

export interface ReportDraft {
  symptoms: Symptom[];
  customSymptom: string;
  bodyArea: string;
  details: string;
  severity: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | "";
  startDate: string;
  startTime: string;
  duration: string;
  notes: string;
}

export type ReportStep = 0 | 1 | 2 | 3;

export const REPORT_STEP_LABELS: Record<ReportStep, string> = {
  0: "Symptoms",
  1: "Body Area",
  2: "Details",
  3: "Review",
};

export function initialDraft(): ReportDraft {
  return {
    symptoms: [],
    customSymptom: "",
    bodyArea: "",
    details: "",
    severity: "",
    startDate: "",
    startTime: "",
    duration: "",
    notes: "",
  };
}