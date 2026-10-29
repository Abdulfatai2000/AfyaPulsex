import { LocateFixed, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import type { LocationDraft, OnboardingErrors } from "@/types/onboarding";
import { OnboardingField, OnboardingSelect } from "./OnboardingField";
import {
  getNigeriaStates,
  getLGAsForState,
  NIGERIA_COUNTRY,
} from "@/components/citizen/location/nigeria-location";

export function LocationStep({
  value,
  onChange,
  errors,
}: {
  value: LocationDraft;
  onChange: (value: LocationDraft) => void;
  errors: OnboardingErrors;
}) {
  const states = useMemo(() => getNigeriaStates(), []);
  const stateOptions = states.map((s) => ({ value: s.name, label: s.name }));
  const lgaOptions = useMemo(
    () =>
      value.state
        ? getLGAsForState(value.state).map((lga) => ({ value: lga, label: lga }))
        : [],
    [value.state],
  );

  const [localState, setLocalState] = useState(value.state);
  const [localLga, setLocalLga] = useState(value.district);

  function handleStateChange(newState: string) {
    setLocalState(newState);
    const newLga = newState ? getLGAsForState(newState)[0] ?? "" : "";
    setLocalLga(newLga);
    onChange({ ...value, state: newState, district: newLga });
  }

  function handleLgaChange(newLga: string) {
    setLocalLga(newLga);
    onChange({ ...value, district: newLga });
  }

  return (
    <div className="ob-fields">
      <OnboardingField
        id="country"
        label="Country (required)"
        autoComplete="country-name"
        value={NIGERIA_COUNTRY}
        readOnly
        className="ob-readonly"
      />
      <OnboardingSelect
        id="state"
        label="State / Region (required)"
        options={[{ value: "", label: "Select State" }, ...stateOptions]}
        value={localState}
        onChange={(e) => handleStateChange(e.target.value)}
        error={errors.state}
      />
      <OnboardingSelect
        id="district"
        label="LGA / District (required)"
        options={[{ value: "", label: "Select LGA" }, ...lgaOptions]}
        value={localLga}
        onChange={(e) => handleLgaChange(e.target.value)}
        error={errors.district}
        disabled={!value.state}
      />
      <OnboardingField
        id="community"
        label="City / Community (optional)"
        autoComplete="address-level3"
        value={value.community}
        onChange={(e) => onChange({ ...value, community: e.target.value.trim() })}
        placeholder="Enter your city or community"
      />
      <div className="ob-location-option">
        <button type="button" disabled aria-describedby="location-pending">
          <LocateFixed aria-hidden="true" />
          Use my approximate location
        </button>
        <p id="location-pending" className="ob-hint">
          Not available yet. Please enter your broad area above.
        </p>
      </div>
      <p className="ob-inline-note">
        <LockKeyhole aria-hidden="true" />
        No exact home address or GPS coordinates are needed.
      </p>
    </div>
  );
}
