"use client";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Pencil } from "lucide-react";
import { Field, SettingsCard } from "./profile-ui";
import { PendingButton } from "../feedback/CitizenLoading";
import { locationSchema } from "../onboarding/validation";
import {
  updateLocationAction,
  type CitizenProfileDTO,
} from "@/server/actions/citizen/profile";
import type { LocationDraft } from "@/types/onboarding";
import {
  getNigeriaStates,
  getLGAsForState,
  NIGERIA_COUNTRY,
} from "@/components/citizen/location/nigeria-location";

function fromAddress(address: CitizenProfileDTO["address"]): LocationDraft {
  return {
    country: address.country ?? NIGERIA_COUNTRY,
    state: address.state ?? "",
    district: address.district ?? "",
    community: address.community ?? "",
  };
}

export function LocationSection({
  initial,
}: {
  initial: CitizenProfileDTO["address"];
}) {
  const states = useMemo(() => getNigeriaStates(), []);
  const stateOptions = states.map((s) => ({ value: s.name, label: s.name }));

  const [values, setValues] = useState<LocationDraft>(() => fromAddress(initial));
  const [draft, setDraft] = useState(values);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LocationDraft, string>>>({});
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
    const result = locationSchema.safeParse(draft);
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
      const profile = await updateLocationAction(result.data);
      setValues(fromAddress(profile.address));
      setEditing(false);
      setSaved(true);
      router.refresh();
    } catch {
      setSaveError("We could not save your location. Please try again.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const draftLgaOptions = useMemo(
    () => (draft.state ? getLGAsForState(draft.state).map((lga) => ({ value: lga, label: lga })) : []),
    [draft.state],
  );

  return (
    <SettingsCard
      title="Location"
      description="Your current broad location. Changing it does not change your historical health records."
      action={!editing ? (
        <button
          type="button"
          className="pf-btn pf-btn-primary"
          onClick={startEditing}
        >
          <Pencil aria-hidden="true" />
          Edit
        </button>
      ) : null}
    >
      {editing ? (
        <form onSubmit={handleSubmit} noValidate>
          <fieldset disabled={saving} className="pf-form-fields">
            <div className="pf-grid">
              <Field
                id="location-country"
                label="Country"
                error={errors.country}
                className="pf-field-full"
              >
                <select value={NIGERIA_COUNTRY} disabled>
                  <option value={NIGERIA_COUNTRY}>{NIGERIA_COUNTRY}</option>
                </select>
              </Field>
              <Field
                id="location-state"
                label="State / Region"
                error={errors.state}
              >
                <select
                  value={draft.state}
                  onChange={(e) => {
                    const newState = e.target.value;
                    const newLga = newState ? getLGAsForState(newState)[0] ?? "" : "";
                    setDraft((prev) => ({ ...prev, state: newState, district: newLga }));
                  }}
                >
                  <option value="">Select State</option>
                  {stateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id="location-district"
                label="LGA / District"
                error={errors.district}
              >
                <select
                  value={draft.district}
                  onChange={(e) => setDraft((prev) => ({ ...prev, district: e.target.value }))}
                  disabled={!draft.state}
                >
                  <option value="">Select LGA</option>
                  {draftLgaOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id="location-community"
                label="City / Community"
                optional
                error={errors.community}
              >
                <input
                  value={draft.community}
                  onChange={(e) => setDraft((prev) => ({ ...prev, community: e.target.value.trim() }))}
                />
              </Field>
            </div>
            <div className="pf-actions">
              <PendingButton
                type="submit"
                className="pf-btn pf-btn-primary"
                pending={saving}
                pendingLabel="Saving..."
              >
                Save location
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
                Country
              </dt>
              <dd style={{ margin: 0, fontSize: 14 }}>{NIGERIA_COUNTRY}</dd>
            </div>
            <div className="pf-field">
              <dt style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                State / Region
              </dt>
              <dd style={{ margin: 0, fontSize: 14 }}>
                {values.state || "Not provided"}
              </dd>
            </div>
            <div className="pf-field">
              <dt style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                LGA / District
              </dt>
              <dd style={{ margin: 0, fontSize: 14 }}>
                {values.district || "Not provided"}
              </dd>
            </div>
            <div className="pf-field">
              <dt style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                City / Community
              </dt>
              <dd style={{ margin: 0, fontSize: 14 }}>
                {values.community || "Not provided"}
              </dd>
            </div>
          </dl>
        </>
      )}
      {saved ? (
        <div className="pf-status pf-status-success" role="status">
          <CheckCircle2 aria-hidden="true" />
          <span>Your location has been saved.</span>
        </div>
      ) : null}
      {saveError && (
        <p className="pf-error" role="alert">
          {saveError}
        </p>
      )}
    </SettingsCard>
  );
}
