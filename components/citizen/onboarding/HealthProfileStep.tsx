import type { HealthProfileDraft, BloodGroup } from "@/types/onboarding";
import { OnboardingSelect } from "./OnboardingField";
const groups: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const lists = [
  {
    key: "allergiesText",
    label: "Allergies",
    placeholder: "Add each allergy on a new line",
  },
  {
    key: "conditionsText",
    label: "Existing Health Conditions",
    placeholder: "Add each known condition on a new line",
  },
  {
    key: "medicationsText",
    label: "Current Medications",
    placeholder: "Add each medication on a new line",
  },
] as const;
export function HealthProfileStep({
  value,
  onChange,
}: {
  value: HealthProfileDraft;
  onChange: (value: HealthProfileDraft) => void;
}) {
  return (
    <div className="ob-fields">
      <p className="ob-optional-note">
        All fields are optional. Add only what you want in your personal health
        history, or choose Skip for now.
      </p>
      <OnboardingSelect
        id="bloodGroup"
        label="Blood Group (optional)"
        value={value.bloodGroup}
        onChange={(e) =>
          onChange({ ...value, bloodGroup: e.target.value as BloodGroup })
        }
        options={[
          { value: "", label: "Select your blood group" },
          { value: "unknown", label: "I don't know" },
          ...groups.map((value) => ({ value, label: value })),
        ]}
      />
      {lists.map(({ key, label, placeholder }) => (
        <div className="ob-field" key={key}>
          <label htmlFor={key}>{label} (optional)</label>
          <textarea
            id={key}
            rows={3}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            placeholder={placeholder}
            aria-describedby={key + "-hint"}
          />
          <p id={key + "-hint"} className="ob-hint">
            One item per line. Leave blank if you prefer not to add anything.
          </p>
        </div>
      ))}
    </div>
  );
}
