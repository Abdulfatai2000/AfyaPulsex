import { z } from "zod";

/** Full name: allows spaces, hyphens, apostrophes, Unicode letters. */
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "Full name is too long.")
  .refine(
    (v) => /^[^\d\s][\p{L}\s'\-.,]+$/u.test(v),
    "Enter a valid full name.",
  );

export type FullNameInput = z.infer<typeof fullNameSchema>;

/** Email with proper format validation. */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter a valid email address.")
  .max(254, "Email is too long.")
  .email("Enter a valid email address.")
  .transform((v) => v.toLowerCase());

export type EmailInput = z.infer<typeof emailSchema>;

/** Nigerian phone number: supports 0XXXXXXXXXX and +234XXXXXXXXXX. */
export const nigerianPhoneSchema = z
  .string()
  .trim()
  .min(1, "Enter a valid Nigerian phone number.")
  .max(20, "Phone number is too long.")
  .refine(
    (v) => /^(?:\+234|0)[789]\d{9}$/.test(v.replace(/\s/g, "")),
    "Enter a valid Nigerian phone number.",
  );

export type NigerianPhoneInput = z.infer<typeof nigerianPhoneSchema>;

/** Normalize Nigerian phone to E.164: +234XXXXXXXXXX */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) {
    return `+${digits}`;
  }
  if (digits.startsWith("0")) {
    return `+234${digits.slice(1)}`;
  }
  return `+234${digits}`;
}

/** Position / designation: required, trimmed, reasonable length. */
export const positionSchema = z
  .string()
  .trim()
  .min(2, "Position / designation is required.")
  .max(120, "Position / designation is too long.")
  .refine(
    (v) => !/^[\s]+$/.test(v),
    "Position / designation is required.",
  );

export type PositionInput = z.infer<typeof positionSchema>;

/**
 * Designation dropdown options (Step 2 — Position / Designation).
 * Designations describe WHAT the applicant does; they are not organisations
 * and never imply approval authority on their own.
 */
export const DESIGNATION_OPTION_VALUES = [
  "Disease Surveillance Officer (DSO)",
  "Disease Surveillance and Notification Officer (DSNO)",
  "State Epidemiologist",
  "Surveillance Focal Person",
  "Other",
] as const;

export type DesignationOption = (typeof DESIGNATION_OPTION_VALUES)[number];

export const designationOptionSchema = z.enum(DESIGNATION_OPTION_VALUES, {
  error: "Select your designation.",
});

export type DesignationOptionInput = z.infer<typeof designationOptionSchema>;

/** Custom organisation name: required when "Other" is selected. */
export const customOrgNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your organisation name.")
  .max(200, "Organisation name is too long.")
  .refine(
    (v) => !/^[\s]+$/.test(v),
    "Enter your organisation name.",
  );

export type CustomOrgNameInput = z.infer<typeof customOrgNameSchema>;

/** Government level the applicant works for: federal | state | local. */
export const governmentLevelSchema = z.enum(["federal", "state", "local"], {
  error: "Select the level of government you work for.",
});

export type GovernmentLevel = z.infer<typeof governmentLevelSchema>;

/**
 * Account password: reuses the existing authentication policy (minimum 8
 * characters, same message as citizen signup/sign-in). Single source of
 * truth — no second password policy.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(128, "Password is too long.");

export type PasswordInput = z.infer<typeof passwordSchema>;

/** Combined form validation schema for the Access Request form. */
export const accessRequestFormSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: nigerianPhoneSchema,
  position: positionSchema,
  governmentLevel: governmentLevelSchema,
  stateId: z.string().min(1, "Select your state."),
  organizationId: z.string().optional(),
  isOtherOrg: z.boolean().default(false),
  customOrgName: customOrgNameSchema.optional(),
  lgaId: z.string().min(1, "Select your LGA."),
});

export type AccessRequestFormData = z.infer<typeof accessRequestFormSchema>;

/** Validate a single field and return the error message or null. */
export function validateField(
  field: string,
  value: unknown,
): string | null {
  try {
    switch (field) {
      case "fullName":
        fullNameSchema.parse(value as string);
        return null;
      case "email":
        emailSchema.parse(value as string);
        return null;
      case "phone":
        nigerianPhoneSchema.parse(value as string);
        return null;
      case "password":
        // Shared authentication policy (see passwordSchema) — reused by
        // citizen signup/sign-in and officer access requests alike.
        passwordSchema.parse(value as string);
        return null;
      case "position":
        designationOptionSchema.parse(value as string);
        return null;
      case "customPosition":
        // Free-text designation shown only when "Other" is selected.
        // Reuses the resolved-designation rules (no duplicate schema).
        positionSchema.parse(value as string);
        return null;
      case "governmentLevel":
        governmentLevelSchema.parse(value as string);
        return null;
      case "customOrgName":
        customOrgNameSchema.parse(value as string);
        return null;
      case "stateId":
        z.string().min(1, "Select your state.").parse(value as string);
        return null;
      case "organizationId":
        if ((value as string)?.length === 0) return "Organisation is required.";
        return null;
      case "lgaId":
        z.string().min(1).parse(value as string);
        return null;
      default:
        return null;
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return err.issues[0]?.message ?? null;
    }
    return null;
  }
}
