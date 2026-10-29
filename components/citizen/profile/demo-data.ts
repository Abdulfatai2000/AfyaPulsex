import type { BloodGroup, PersonalInformationDraft } from "@/types/onboarding";

/**
 * UI PREVIEW ONLY — isolated demo/default state for the Profile & Settings
 * preview. Nothing here is user data and nothing is persisted.
 * TODO(DEV3): replace reads with an authenticated citizen-profile boundary and
 * serialize agreed DTOs (IDs as strings, dates in an agreed format).
 * TODO(DEV4): supply authenticated identity; email is owned by authentication.
 */
export const DEMO_PROFILE: PersonalInformationDraft = {
  fullName: "Amara Okafor",
  dateOfBirth: "1992-04-18",
  gender: "female",
};

// Email is read-only (owned by authentication). Clearly a preview value.
export const DEMO_EMAIL = "amara.okafor@example.com";

export const GENDER_OPTIONS: { value: PersonalInformationDraft["gender"]; label: string }[] =
  [
    { value: "female", label: "Female" },
    { value: "male", label: "Male" },
    { value: "non_binary", label: "Non-binary" },
    { value: "undisclosed", label: "Prefer not to say" },
  ];

export const BLOOD_GROUP_OPTIONS: { value: BloodGroup; label: string }[] = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
  { value: "unknown", label: "Not sure" },
];

export const TEMPERATURE_UNITS = [
  { value: "celsius", label: "Celsius (°C)" },
  { value: "fahrenheit", label: "Fahrenheit (°F)" },
] as const;

export const WEIGHT_UNITS = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "lb", label: "Pounds (lb)" },
] as const;