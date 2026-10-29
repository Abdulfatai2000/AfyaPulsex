"use client";
import { useState } from "react";
import { Languages } from "lucide-react";
import { PreviewNote, SettingsCard, SettingsRow } from "./profile-ui";
import { TEMPERATURE_UNITS, WEIGHT_UNITS } from "./demo-data";

type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number]["value"];
type WeightUnit = (typeof WEIGHT_UNITS)[number]["value"];

export function PreferencesSection() {
  const [temperature, setTemperature] = useState<TemperatureUnit>("celsius");
  const [weight, setWeight] = useState<WeightUnit>("kg");
  const [changed, setChanged] = useState(false);

  // TODO(DEV3): persist preferences through the agreed boundary.

  return (
    <>
      <SettingsCard
        title="Units"
        description="Select your preferred measurement units."
      >
        <fieldset className="pf-fieldset">
          <legend className="sr-only">Temperature unit</legend>
          <div className="pf-row" style={{ paddingTop: 0 }}>
            <div>
              <strong>Temperature</strong>
              <span>
                Which unit is used for temperature readings and records.
              </span>
            </div>
          </div>
          <div className="pf-segmented">
            {TEMPERATURE_UNITS.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="temperature-unit"
                  value={option.value}
                  checked={temperature === option.value}
                  onChange={() => {
                    setTemperature(option.value);
                    setChanged(true);
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="pf-fieldset">
          <legend className="sr-only">Weight unit</legend>
          <div className="pf-row">
            <div>
              <strong>Weight</strong>
              <span>Which unit is used for weight measurements.</span>
            </div>
          </div>
          <div className="pf-segmented">
            {WEIGHT_UNITS.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="weight-unit"
                  value={option.value}
                  checked={weight === option.value}
                  onChange={() => {
                    setWeight(option.value);
                    setChanged(true);
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </SettingsCard>

      <SettingsCard title="Language">
        <SettingsRow
          title="English &mdash; Current language"
          description="AfyaPulse is currently available in English."
          control={<Languages aria-hidden="true" className="pf-muted" />}
        />
      </SettingsCard>

      {changed ? (
        <PreviewNote>These choices apply while this page is open.</PreviewNote>
      ) : (
        <PreviewNote>These choices reset when you leave this page.</PreviewNote>
      )}
    </>
  );
}
