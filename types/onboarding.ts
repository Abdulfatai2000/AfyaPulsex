/** Frontend drafts only. Not database schemas or authoritative consent records. */
export interface PersonalInformationDraft {
  fullName: string;
  dateOfBirth: string;
  gender: "" | "female" | "male" | "non_binary" | "undisclosed";
}
export interface LocationDraft {
  country: string;
  state: string;
  district: string;
  community: string;
}
export type BloodGroup =
  "" | "unknown" | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export interface HealthProfileDraft {
  bloodGroup: BloodGroup;
  allergiesText: string;
  conditionsText: string;
  medicationsText: string;
}
/** TODO(DEV3): agree on purpose identifiers and versioned history DTOs.
 * TODO(DEV4): provide policy versions and authoritative server timestamps.
 * null explicitly means these values have NOT been supplied by the backend.
 */
export interface ConsentChoiceDraft {
  purpose: "community_insights";
  decision: "granted" | "declined";
  policyVersion: string | null;
  recordedAt: string | null;
}
export interface PrivacyDraft {
  personalTrackingAcknowledged: boolean;
  communityContribution: ConsentChoiceDraft;
}
export interface OnboardingDraft {
  personal: PersonalInformationDraft;
  location: LocationDraft;
  healthProfile: HealthProfileDraft;
  healthProfileSkipped: boolean;
  privacy: PrivacyDraft;
}
export type OnboardingStep = 0 | 1 | 2 | 3 | 4;
export type OnboardingErrors = Partial<
  Record<
    | keyof PersonalInformationDraft
    | keyof LocationDraft
    | "personalTrackingAcknowledged",
    string
  >
>;
