"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import type { BloodGroup } from "@/types/onboarding";
import { BLOOD_GROUP_OPTIONS } from "./demo-data";
import { Field, PreviewNote, SettingsCard } from "./profile-ui";

import { updateHealthProfileAction } from "@/server/actions/citizen/profile";
import {
  healthProfileSettingsSchema,
  type HealthProfileSettings,
} from "@/server/validation/profile";
import { PendingButton } from "../feedback/CitizenLoading";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

const emptyMedication = { name: "", dosage: "", frequency: "" };

export function HealthProfileSection({
  initial,
}: {
  initial: HealthProfileSettings;
}) {
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(initial.bloodGroup);
  const [allergies, setAllergies] = useState<string[]>(initial.allergies);
  const [conditions, setConditions] = useState<string[]>(initial.conditions);
  const [medications, setMedications] = useState<Medication[]>(
    initial.medications,
  );

  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [medOpen, setMedOpen] = useState(false);
  const [medDraft, setMedDraft] = useState<Medication>(emptyMedication);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<{
    allergy?: string;
    condition?: string;
    medication?: string;
  }>({});
  const [saved, setSaved] = useState(false);

  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const busy = useRef(false);
  async function saveHealth() {
    if (busy.current) return;
    setSaved(false);
    setSaveError("");
    if (allergyInput.trim() || conditionInput.trim() || medOpen) {
      setSaveError("Add or cancel your unfinished list entry before saving.");
      return;
    }
    const parsed = healthProfileSettingsSchema.safeParse({
      bloodGroup,
      allergies,
      conditions,
      medications,
    });
    if (!parsed.success) {
      setSaveError(parsed.error.issues[0].message);
      return;
    }
    busy.current = true;
    setSaving(true);
    try {
      const result = await updateHealthProfileAction(parsed.data);
      setBloodGroup(result.bloodGroup);
      setAllergies(result.allergies);
      setConditions(result.conditions);
      setMedications(result.medications);
      setSaved(true);
      router.refresh();
    } catch {
      setSaveError("We could not save your health profile. Please try again.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  function addToList(
    key: "allergies" | "conditions",
    input: string,
    setInput: (value: string) => void,
    setError: (value?: string) => void,
  ) {
    const value = input.trim();
    if (!value) {
      setError("Enter a value before adding.");
      return;
    }
    const next = key === "allergies" ? allergies : conditions;
    if (next.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setError("That item is already on your list.");
      return;
    }
    if (key === "allergies") setAllergies([...allergies, value]);
    else setConditions([...conditions, value]);
    setInput("");
    setError(undefined);
    setSaved(false);
  }

  function removeFromList(key: "allergies" | "conditions", index: number) {
    setSaved(false);
    if (key === "allergies")
      setAllergies(allergies.filter((_, i) => i !== index));
    else setConditions(conditions.filter((_, i) => i !== index));
  }

  function beginEditMedication(index: number) {
    setEditingIndex(index);
    setMedDraft(medications[index]);
    setMedOpen(true);
    setErrors((prev) => ({ ...prev, medication: undefined }));
  }

  function saveMedication() {
    if (!medDraft.name.trim()) {
      setErrors((prev) => ({
        ...prev,
        medication: "Please enter the medication name.",
      }));
      return;
    }
    if (editingIndex !== null) {
      setMedications(
        medications.map((med, i) => (i === editingIndex ? medDraft : med)),
      );
    } else {
      setMedications([...medications, medDraft]);
    }
    setMedOpen(false);
    setEditingIndex(null);
    setMedDraft(emptyMedication);
    setSaved(false);
  }

  function removeMedication(index: number) {
    setSaved(false);
    setMedications(medications.filter((_, i) => i !== index));
  }

  return (
    <SettingsCard
      title="Health profile"
      description="Optional context you choose to keep in your personal history. Nothing here is used to diagnose or infer conditions."
    >
      <fieldset
        disabled={saving}
        className="pf-form-fields"
        onChange={() => setSaved(false)}
      >
        <div className="pf-grid">
          <Field
            label="Blood group"
            id="health-blood-group"
            hint="Optional — only add this if you know it."
            optional
            className={undefined}
          >
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
            >
              <option value="">Not provided</option>
              {BLOOD_GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <section aria-labelledby="health-allergies" style={{ marginTop: 22 }}>
          <h3 id="health-allergies" className="pf-card-subhead">
            Allergies
          </h3>
          {allergies.length ? (
            allergies.map((item, index) => (
              <div className="pf-list-item" key={item}>
                <strong>{item}</strong>
                <button
                  type="button"
                  className="pf-btn-icon"
                  aria-label={`Remove ${item} from allergies`}
                  onClick={() => removeFromList("allergies", index)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ))
          ) : (
            <p className="pf-empty-label">No allergies added</p>
          )}
          <div className="pf-add-row">
            <label htmlFor="allergy-input" className="sr-only">
              Add an allergy
            </label>
            <input
              id="allergy-input"
              type="text"
              placeholder="e.g. Peanuts"
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              aria-invalid={errors.allergy ? true : undefined}
              aria-describedby={errors.allergy ? "allergy-error" : undefined}
            />
            <button
              type="button"
              className="pf-add-btn"
              onClick={() =>
                addToList("allergies", allergyInput, setAllergyInput, (value) =>
                  setErrors((prev) => ({ ...prev, allergy: value })),
                )
              }
            >
              <Plus aria-hidden="true" />
              Add
            </button>
          </div>
          {errors.allergy ? (
            <p id="allergy-error" className="pf-error">
              {errors.allergy}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="health-conditions" style={{ marginTop: 22 }}>
          <h3 id="health-conditions" className="pf-card-subhead">
            Existing conditions
          </h3>
          {conditions.length ? (
            conditions.map((item, index) => (
              <div className="pf-list-item" key={item}>
                <strong>{item}</strong>
                <button
                  type="button"
                  className="pf-btn-icon"
                  aria-label={`Remove ${item} from existing conditions`}
                  onClick={() => removeFromList("conditions", index)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ))
          ) : (
            <p className="pf-empty-label">No existing conditions added</p>
          )}
          <div className="pf-add-row">
            <label htmlFor="condition-input" className="sr-only">
              Add an existing condition
            </label>
            <input
              id="condition-input"
              type="text"
              placeholder="e.g. Asthma"
              value={conditionInput}
              onChange={(e) => setConditionInput(e.target.value)}
              aria-invalid={errors.condition ? true : undefined}
              aria-describedby={
                errors.condition ? "condition-error" : undefined
              }
            />
            <button
              type="button"
              className="pf-add-btn"
              onClick={() =>
                addToList(
                  "conditions",
                  conditionInput,
                  setConditionInput,
                  (value) =>
                    setErrors((prev) => ({ ...prev, condition: value })),
                )
              }
            >
              <Plus aria-hidden="true" />
              Add
            </button>
          </div>
          {errors.condition ? (
            <p id="condition-error" className="pf-error">
              {errors.condition}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="health-medications" style={{ marginTop: 22 }}>
          <h3 id="health-medications" className="pf-card-subhead">
            Current medications
          </h3>
          {medications.length ? (
            medications.map((med, index) => (
              <div className="pf-list-item" key={med.name}>
                <strong>
                  {med.name}
                  <small>
                    {[med.dosage, med.frequency].filter(Boolean).join(" · ") ||
                      "Details not provided"}
                  </small>
                </strong>
                <button
                  type="button"
                  className="pf-btn pf-btn-secondary"
                  onClick={() => beginEditMedication(index)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="pf-btn-icon"
                  aria-label={`Remove ${med.name} from medications`}
                  onClick={() => removeMedication(index)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ))
          ) : (
            <p className="pf-empty-label">No medications added</p>
          )}

          {medOpen ? (
            <div
              className="pf-med-grid"
              role="group"
              aria-label={
                editingIndex !== null ? "Edit medication" : "Add medication"
              }
              style={{ marginTop: 14 }}
            >
              <Field
                label="Medication name"
                id="med-name"
                error={
                  errors.medication && !medDraft.name.trim()
                    ? errors.medication
                    : undefined
                }
                className={undefined}
              >
                <input
                  type="text"
                  placeholder="e.g. Salbutamol inhaler"
                  value={medDraft.name}
                  onChange={(e) =>
                    setMedDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </Field>
              <Field
                label="Dosage"
                id="med-dosage"
                optional
                className={undefined}
              >
                <input
                  type="text"
                  placeholder="e.g. 100 mcg"
                  value={medDraft.dosage}
                  onChange={(e) =>
                    setMedDraft((prev) => ({ ...prev, dosage: e.target.value }))
                  }
                />
              </Field>
              <Field
                label="Frequency"
                id="med-frequency"
                optional
                className={undefined}
              >
                <input
                  type="text"
                  placeholder="e.g. Twice a day"
                  value={medDraft.frequency}
                  onChange={(e) =>
                    setMedDraft((prev) => ({
                      ...prev,
                      frequency: e.target.value,
                    }))
                  }
                />
              </Field>
              <div className="pf-med-actions">
                <button
                  type="button"
                  className="pf-btn pf-btn-primary"
                  onClick={saveMedication}
                >
                  {editingIndex !== null ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  className="pf-btn pf-btn-secondary"
                  onClick={() => {
                    setMedOpen(false);
                    setEditingIndex(null);
                    setMedDraft(emptyMedication);
                    setErrors((prev) => ({ ...prev, medication: undefined }));
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="pf-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                onClick={() => setMedOpen(true)}
              >
                <Plus aria-hidden="true" />
                Add medication
              </button>
            </div>
          )}
        </section>

        <div className="pf-actions">
          <PendingButton
            type="button"
            className="pf-btn pf-btn-primary"
            pending={saving}
            pendingLabel="Saving..."
            onClick={saveHealth}
          >
            Save health profile
          </PendingButton>
        </div>
      </fieldset>
      {saveError && (
        <p role="alert" className="pf-error">
          {saveError}
        </p>
      )}
      {saved ? (
        <div className="pf-status pf-status-success" role="status">
          <CheckCircle2 aria-hidden="true" />
          <span>Your health profile has been saved.</span>
        </div>
      ) : null}
      <div style={{ marginTop: 16 }}>
        <PreviewNote>
          This section is optional and only stores what you type. AfyaPulse
          never infers conditions from reports, vitals, or AI.
        </PreviewNote>
      </div>
    </SettingsCard>
  );
}
