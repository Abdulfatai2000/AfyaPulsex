import { z } from "zod";
import type { HealthProfileDraft } from "@/types/onboarding";

/** Evaluate on submission in the browser; do not freeze "today" at build time. */
function localToday() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}
export const personalInformationSchema = z.object({
  fullName: z.string().trim().min(1, "Please enter your full name."),
  dateOfBirth: z.iso
    .date("Please enter a valid date of birth.")
    .refine(
      (value) => value <= localToday(),
      "Your date of birth cannot be in the future.",
    ),
  gender: z.enum(["", "female", "male", "non_binary", "undisclosed"]),
});
export const locationSchema = z.object({
  country: z.string().trim().min(1, "Please enter your country."),
  state: z.string().trim().min(1, "Please enter your state or region."),
  district: z.string().trim().min(1, "Please enter your LGA or district."),
  community: z.string().trim(),
});
export const privacySchema = z.object({
  personalTrackingAcknowledged: z
    .boolean()
    .refine(
      (value) => value,
      "Please acknowledge personal health tracking to continue. Optional community contribution can stay off.",
    ),
});
/** Ready for a future DTO adapter; never writes data or infers medical conditions. */
export function healthProfileValues(draft: HealthProfileDraft) {
  const entries = (value: string) =>
    value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  return {
    bloodGroup: draft.bloodGroup,
    allergies: entries(draft.allergiesText),
    conditions: entries(draft.conditionsText),
    medications: entries(draft.medicationsText),
  };
}
