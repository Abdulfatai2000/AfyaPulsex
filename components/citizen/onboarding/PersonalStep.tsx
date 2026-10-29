import type {
  PersonalInformationDraft,
  OnboardingErrors,
} from "@/types/onboarding";
import { OnboardingField, OnboardingSelect } from "./OnboardingField";
export function PersonalStep({
  value,
  onChange,
  errors,
}: {
  value: PersonalInformationDraft;
  onChange: (value: PersonalInformationDraft) => void;
  errors: OnboardingErrors;
}) {
  return (
    <div className="ob-fields">
      <OnboardingField
        id="fullName"
        label="Full Name (required)"
        autoComplete="name"
        value={value.fullName}
        onChange={(e) => onChange({ ...value, fullName: e.target.value })}
        error={errors.fullName}
        required
        placeholder="Your full name"
      />
      <OnboardingField
        id="dateOfBirth"
        label="Date of Birth (required)"
        type="date"
        autoComplete="bday"
        value={value.dateOfBirth}
        onChange={(e) => onChange({ ...value, dateOfBirth: e.target.value })}
        error={errors.dateOfBirth}
        hint="Use your date of birth, not a future date."
        required
      />
      <OnboardingSelect
        id="gender"
        label="Sex / Gender (optional)"
        value={value.gender}
        onChange={(e) =>
          onChange({
            ...value,
            gender: e.target.value as PersonalInformationDraft["gender"],
          })
        }
        options={[
          { value: "", label: "Select an option" },
          { value: "female", label: "Female" },
          { value: "male", label: "Male" },
          { value: "non_binary", label: "Non-binary" },
          { value: "undisclosed", label: "Prefer not to say" },
        ]}
      />
    </div>
  );
}
