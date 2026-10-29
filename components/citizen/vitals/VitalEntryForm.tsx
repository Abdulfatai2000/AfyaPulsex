"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import type { SaveVital, VitalReading, VitalType } from "@/types/vitals";
import { PendingButton } from "../feedback/CitizenLoading";
import { vitalConfigs } from "./config";
import {
  localMeasurementTime,
  NOTE_LIMIT,
  vitalEntrySchema,
} from "./validation";

export function VitalEntryForm({
  type,
  saveVital,
  onSaved,
  onBusy,
  onBack,
  onClose,
}: {
  type: VitalType;
  saveVital?: SaveVital;
  onSaved: (readings: VitalReading[]) => void;
  onBusy: (busy: boolean) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const config = vitalConfigs[type];
  const [draft, setDraft] = useState(() => ({
    value: "",
    systolic: "",
    diastolic: "",
    unit: String(config.units[0]),
    ...localMeasurementTime(),
    note: "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"ready" | "saving" | "success" | "error">(
    "ready",
  );
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);
  useEffect(() => {
    if (Object.keys(errors).length)
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [errors]);
  useEffect(() => {
    if (state === "success" || state === "error") status.current?.focus();
  }, [state]);

  function field(name: keyof typeof draft, label: string, inputType = "text") {
    return (
      <div className="vt-field">
        <label htmlFor={`vt-${name}`}>{label}</label>
        <input
          id={`vt-${name}`}
          type={inputType}
          inputMode={inputType === "text" ? "decimal" : undefined}
          value={draft[name]}
          required
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `vt-${name}-error` : undefined}
          onChange={(event) =>
            setDraft((previous) => ({
              ...previous,
              [name]: event.target.value,
            }))
          }
        />
        {errors[name] && (
          <p id={`vt-${name}-error`} className="vt-error">
            {errors[name]}
          </p>
        )}
      </div>
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const result = vitalEntrySchema.safeParse({ ...draft, type });
    setMessage("");
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues)
        next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      setState("ready");
      return;
    }
    setErrors({});
    if (!saveVital) {
      setMessage(
        "Your entry passed validation, but saving is not connected yet. Nothing has been saved. Your entries remain in this form.",
      );
      setState("error");
      return;
    }
    submitting.current = true;
    onBusy(true);
    setState("saving");
    try {
      // A fulfilled handler must confirm persistence and return the server's readings.
      const readings = await saveVital(result.data);
      onSaved(readings);
      setState("success");
    } catch {
      setMessage(
        "We could not confirm that this reading was saved. Your entries are still here. Please try again.",
      );
      setState("error");
    } finally {
      submitting.current = false;
      onBusy(false);
    }
  }
  if (state === "success")
    return (
      <div className="vt-success" ref={status} tabIndex={-1} role="status">
        <CheckCircle2 aria-hidden="true" size={40} />
        <h3>Vital recorded</h3>
        <p>Your measurement has been saved.</p>
        <button className="vt-primary" onClick={onClose}>
          Done
        </button>
      </div>
    );
  return (
    <form
      ref={form}
      onSubmit={submit}
      noValidate
      aria-busy={state === "saving"}
    >
      <p className="vt-form-intro">
        Enter the latest reading you already measured with your own device.
      </p>
      {!saveVital && (
        <p className="vt-integration-note">
          Preview only: saving is not connected. Closing this form clears its
          entries.
        </p>
      )}
      <fieldset disabled={state === "saving"}>
        <legend className="sr-only">{config.label} measurement</legend>
        <div className="vt-field-grid">
          {type === "blood_pressure" ? (
            <>
              {field("systolic", "Systolic (mmHg)")}
              {field("diastolic", "Diastolic (mmHg)")}
            </>
          ) : (
            field("value", `${config.label} (${draft.unit})`)
          )}
          {config.units.length > 1 && (
            <div className="vt-field">
              <label htmlFor="vt-unit">Unit</label>
              <select
                id="vt-unit"
                value={draft.unit}
                aria-invalid={!!errors.unit}
                aria-describedby={errors.unit ? "vt-unit-error" : undefined}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    unit: event.target.value,
                  }))
                }
              >
                {config.units.map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
              {errors.unit && (
                <p id="vt-unit-error" className="vt-error">
                  {errors.unit}
                </p>
              )}
            </div>
          )}
        </div>
        <p className="vt-measured-label">
          When was this measurement taken?{" "}
          <span>Use your device’s local date and time.</span>
        </p>
        <div className="vt-field-grid">
          {field("date", "Measurement date", "date")}
          {field("time", "Measurement time", "time")}
        </div>
        <div className="vt-field">
          <label htmlFor="vt-note">Note (optional)</label>
          <textarea
            id="vt-note"
            value={draft.note}
            maxLength={NOTE_LIMIT}
            rows={3}
            placeholder="e.g. Before bed, Morning check, After walk"
            aria-invalid={!!errors.note}
            aria-describedby={
              errors.note ? "vt-note-counter vt-note-error" : "vt-note-counter"
            }
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                note: event.target.value,
              }))
            }
          />
          <span id="vt-note-counter" className="vt-counter">
            {draft.note.length}/{NOTE_LIMIT} characters
          </span>
          {errors.note && (
            <p className="vt-error" id="vt-note-error">
              {errors.note}
            </p>
          )}
        </div>
      </fieldset>
      {message && (
        <div
          ref={status}
          tabIndex={-1}
          role="alert"
          className="vt-error vt-save-error"
        >
          {message}
        </div>
      )}
      <div className="vt-form-actions">
        <button
          type="button"
          className="vt-secondary"
          disabled={state === "saving"}
          onClick={onBack}
        >
          Back
        </button>
        <PendingButton
          className="vt-primary"
          type="submit"
          pending={state === "saving"}
          pendingLabel="Saving..."
        >
          {saveVital ? "Save reading" : "Validate entry"}
        </PendingButton>
      </div>
      {state === "saving" && (
        <p role="status" className="vt-muted">
          Saving your reading. Please wait.
        </p>
      )}
    </form>
  );
}
