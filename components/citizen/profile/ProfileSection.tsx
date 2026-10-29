"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ProfilePhoto } from "./ProfilePhoto";
import { CheckCircle2, Pencil } from "lucide-react";
import type { PersonalInformationDraft } from "@/types/onboarding";
import { GENDER_OPTIONS } from "./demo-data";
import { Field, SettingsCard } from "./profile-ui";

type ProfileErrors = Partial<
  Record<"fullName" | "dateOfBirth" | "gender", string>
>;

import { personalInformationSchema } from "../onboarding/validation";
import {
  updatePersonalInformationAction,
  type CitizenProfileDTO,
} from "@/server/actions/citizen/profile";
import { PendingButton } from "../feedback/CitizenLoading";
function fromProfile(profile: CitizenProfileDTO): PersonalInformationDraft {
  return {
    fullName: profile.fullName,
    dateOfBirth: profile.dateOfBirth?.slice(0, 10) ?? "",
    gender: profile.gender as PersonalInformationDraft["gender"],
  };
}
const genderLabel = (value: PersonalInformationDraft["gender"]) =>
  GENDER_OPTIONS.find((o) => o.value === value)?.label ?? "Not provided";

function formatDate(value: string) {
  if (!value) return "Not provided";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function ProfileSection({ initial }: { initial: CitizenProfileDTO }) {
  const [values, setValues] = useState<PersonalInformationDraft>(
    fromProfile(initial),
  );
  const [draft, setDraft] = useState(values);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const busy = useRef(false);
  function startEditing() {
    setDraft(values);
    setErrors({});
    setSaved(false);
    setEditing(true);
  }

  function cancel() {
    setErrors({});
    setEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    setSaved(false);
    setSaveError("");
    const result = personalInformationSchema.safeParse(draft);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [issue.path[0], issue.message]),
        ),
      );
      return;
    }
    setErrors({});
    busy.current = true;
    setSaving(true);
    try {
      const savedProfile = await updatePersonalInformationAction(result.data);
      setValues(fromProfile(savedProfile));
      setEditing(false);
      setSaved(true);
      router.refresh();
    } catch {
      setSaveError("We could not save your profile. Please try again.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <ProfilePhoto />
      <SettingsCard
        title="Basic information"
        description="The details AfyaPulse uses for your personal health experience."
      >
        {editing ? (
          <form onSubmit={handleSubmit} noValidate>
            <fieldset disabled={saving} className="pf-form-fields">
              <div className="pf-grid">
                <Field
                  label="Full name"
                  id="profile-full-name"
                  error={errors.fullName}
                  className="pf-field-full"
                >
                  <input
                    type="text"
                    autoComplete="name"
                    value={draft.fullName}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                  />
                </Field>
                <div className="pf-field pf-field-full">
                  <label htmlFor="profile-email">Email address</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={initial.email}
                    readOnly
                    disabled
                  />
                  <p className="pf-hint">
                    Managed by your sign-in. Email is read-only.
                  </p>
                </div>
                <Field
                  label="Date of birth"
                  id="profile-dob"
                  hint="Used only for your personal health record."
                  error={errors.dateOfBirth}
                  className={undefined}
                >
                  <input
                    type="date"
                    value={draft.dateOfBirth}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        dateOfBirth: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field
                  label="Gender"
                  id="profile-gender"
                  hint="Optional. Choose “Prefer not to say” to leave it undisclosed."
                  error={errors.gender}
                  optional
                  className={undefined}
                >
                  <select
                    value={draft.gender}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        gender: e.target
                          .value as PersonalInformationDraft["gender"],
                      }))
                    }
                  >
                    <option value="">Select an option</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="pf-actions">
                <PendingButton
                  type="submit"
                  className="pf-btn pf-btn-primary"
                  pending={saving}
                  pendingLabel="Saving..."
                >
                  Save changes
                </PendingButton>
                <button
                  type="button"
                  className="pf-btn pf-btn-secondary"
                  onClick={cancel}
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        ) : (
          <>
            <dl className="pf-grid" style={{ margin: 0 }}>
              <div className="pf-field">
                <dt style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  Full name
                </dt>
                <dd style={{ margin: 0, fontSize: 14 }}>
                  {values.fullName || "Not provided"}
                </dd>
              </div>
              <div className="pf-field">
                <dt style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  Email address
                </dt>
                <dd style={{ margin: 0, fontSize: 14 }}>{initial.email}</dd>
              </div>
              <div className="pf-field">
                <dt style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  Date of birth
                </dt>
                <dd style={{ margin: 0, fontSize: 14 }}>
                  {formatDate(values.dateOfBirth)}
                </dd>
              </div>
              <div className="pf-field">
                <dt style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  Gender
                </dt>
                <dd style={{ margin: 0, fontSize: 14 }}>
                  {genderLabel(values.gender)}
                </dd>
              </div>
            </dl>
            <div className="pf-actions">
              <button
                type="button"
                className="pf-btn pf-btn-primary"
                onClick={startEditing}
              >
                <Pencil aria-hidden="true" />
                Edit profile
              </button>
            </div>
          </>
        )}
        {saved ? (
          <div className="pf-status pf-status-success" role="status">
            <CheckCircle2 aria-hidden="true" />
            <span>Your profile has been saved.</span>
          </div>
        ) : null}
        {saveError && (
          <p className="pf-error" role="alert">
            {saveError}
          </p>
        )}
      </SettingsCard>
    </>
  );
}
