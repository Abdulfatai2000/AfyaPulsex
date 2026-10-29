"use client";
import { useState, useMemo } from "react";
import { FileText, Calendar, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";
import type { ReportDraft } from "@/types/report";

const DURATION_OPTIONS = [
  { value: "<1h", label: "Less than 1 hour" },
  { value: "1-6h", label: "1–6 hours" },
  { value: "6-24h", label: "6–24 hours" },
  { value: "1-3d", label: "1–3 days" },
  { value: "4-7d", label: "4–7 days" },
  { value: "1w+", label: "More than 1 week" },
] as const;

interface DetailsStepProps {
  value: Pick<ReportDraft, "details" | "severity" | "startDate" | "startTime" | "duration" | "notes">;
  onChange: (value: Pick<ReportDraft, "details" | "severity" | "startDate" | "startTime" | "duration" | "notes">) => void;
  onBack: () => void;
  onNext: () => void;
  symptoms: ReportDraft["symptoms"];
  bodyArea: string;
}

export function DetailsStep({
  value,
  onChange,
  onBack,
  onNext,
  symptoms,
  bodyArea,
}: DetailsStepProps) {
  const [startDateError, setStartDateError] = useState("");
  const [startTimeError, setStartTimeError] = useState("");
  const [durationError, setDurationError] = useState("");
  const [severityError, setSeverityError] = useState("");

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  const hasBodyArea = bodyArea.trim().length > 0;

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({ ...value, startDate: val });
    if (val && val > today) {
      setStartDateError("Start date cannot be in the future");
    } else {
      setStartDateError("");
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({ ...value, startTime: val });
    if (val && value.startDate === today) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      if (val > currentTime) {
        setStartTimeError("Start time cannot be in the future");
      } else {
        setStartTimeError("");
      }
    } else {
      setStartTimeError("");
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange({ ...value, duration: val });
    if (val) setDurationError("");
  };

  const handleSeverityChange = (level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) => {
    onChange({ ...value, severity: level });
    setSeverityError("");
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 500) {
      onChange({ ...value, notes: val });
    }
  };

  const isValid = value.severity && value.startDate && value.startTime && value.duration;

  const selectedSeverityLabel = value.severity
    ? value.severity <= 3
      ? "Mild"
      : value.severity <= 6
      ? "Moderate"
      : "Severe"
    : "";

  return (
    <div className="dt-details-step">
      <header className="dt-header">
        <div className="dt-icon-wrapper">
          <FileText className="dt-icon" aria-hidden="true" />
        </div>
        <div className="dt-title-group">
          <h2 className="dt-title">Details & Severity</h2>
          <p className="dt-description">
            Provide context about timing, severity, and any additional notes.
          </p>
        </div>
      </header>

      {(symptoms.length > 0 || hasBodyArea) && (
        <div className="dt-summary" aria-label="Selected summary">
          <div className="dt-summary-row">
            <span className="dt-summary-label">Symptoms:</span>
            <span className="dt-summary-value">
              {symptoms.length > 0 ? symptoms.join(", ") : "—"}
            </span>
          </div>
          {hasBodyArea && (
            <div className="dt-summary-row">
              <span className="dt-summary-label">Body area:</span>
              <span className="dt-summary-value">{bodyArea}</span>
            </div>
          )}
        </div>
      )}

      <div className="dt-section">
        <fieldset className="dt-severity-fieldset" aria-describedby="severity-hint">
          <legend className="dt-label">How severe is it? <span className="dt-required" aria-hidden="true">*</span></legend>
          <div className="dt-severity-scale" role="radiogroup" aria-label="Severity scale 1-10">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <label key={level} className="dt-severity-label">
                <input
                  type="radio"
                  name="severity"
                  value={level}
                  checked={value.severity === level}
                  onChange={() => handleSeverityChange(level as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10)}
                  className="dt-severity-input"
                  required
                />
                <span
                  className={cn(
                    "dt-severity-btn",
                    value.severity === level && "dt-severity-btn--selected",
                    level <= 3 && "dt-severity-btn--mild",
                    level >= 4 && level <= 6 && "dt-severity-btn--moderate",
                    level >= 7 && "dt-severity-btn--severe"
                  )}
                >
                  {level}
                </span>
                <span className="dt-severity-label-text">
                  {level <= 3 ? "Mild" : level <= 6 ? "Moderate" : "Severe"}
                </span>
              </label>
            ))}
          </div>
          <p id="severity-hint" className={cn("dt-severity-hint", severityError && "dt-severity-hint--error")}>
            {severityError || "1–3: Mild · 4–6: Moderate · 7–10: Severe"}
          </p>
          {value.severity && (
            <div className="dt-severity-current" aria-live="polite">
              <span className="dt-severity-current-label">Current:</span>
              <span className={cn("dt-severity-current-value", value.severity <= 3 && "mild", value.severity >= 4 && value.severity <= 6 && "moderate", value.severity >= 7 && "severe")}>
                {value.severity} — {selectedSeverityLabel}
              </span>
            </div>
          )}
        </fieldset>
      </div>

      <div className="dt-section">
        <label htmlFor="start-date" className="dt-label">
          When did it start? <span className="dt-required" aria-hidden="true">*</span>
        </label>
        <div className="dt-datetime-row">
          <div className="dt-field">
            <label htmlFor="start-date" className="dt-sublabel">
              <Calendar className="dt-sublabel-icon" aria-hidden="true" />
              Date
            </label>
            <Input
              id="start-date"
              type="date"
              value={value.startDate}
              onChange={handleStartDateChange}
              max={today}
              className={cn("dt-input", startDateError && "dt-input--error")}
              aria-invalid={!!startDateError}
              aria-describedby={startDateError ? "start-date-error" : undefined}
              required
            />
            {startDateError && (
              <p id="start-date-error" className="dt-field-error" role="alert">
                <AlertCircle className="dt-error-icon" aria-hidden="true" />
                {startDateError}
              </p>
            )}
          </div>
          <div className="dt-field">
            <label htmlFor="start-time" className="dt-sublabel">
              <Clock className="dt-sublabel-icon" aria-hidden="true" />
              Time
            </label>
            <Input
              id="start-time"
              type="time"
              value={value.startTime}
              onChange={handleStartTimeChange}
              className={cn("dt-input", startTimeError && "dt-input--error")}
              aria-invalid={!!startTimeError}
              aria-describedby={startTimeError ? "start-time-error" : undefined}
              required
            />
            {startTimeError && (
              <p id="start-time-error" className="dt-field-error" role="alert">
                <AlertCircle className="dt-error-icon" aria-hidden="true" />
                {startTimeError}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="dt-section">
        <label htmlFor="duration" className="dt-label">
          How long has it lasted? <span className="dt-required" aria-hidden="true">*</span>
        </label>
        <select
          id="duration"
          value={value.duration}
          onChange={handleDurationChange}
          className={cn("dt-select", durationError && "dt-select--error")}
          aria-invalid={!!durationError}
          aria-describedby={durationError ? "duration-error" : "duration-hint"}
          required
        >
          <option value="">Select duration</option>
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {durationError && (
          <p id="duration-error" className="dt-field-error" role="alert">
            <AlertCircle className="dt-error-icon" aria-hidden="true" />
            {durationError}
          </p>
        )}
        <p id="duration-hint" className="dt-hint">Required</p>
      </div>

      <div className="dt-section">
        <label htmlFor="notes" className="dt-label">
          Additional notes (optional)
        </label>
        <div className="dt-notes-wrapper">
          <textarea
            id="notes"
            value={value.notes}
            onChange={handleNotesChange}
            placeholder="Any triggers? What makes it better or worse? Current medications? Other relevant context…"
            className="dt-textarea"
            rows={4}
            maxLength={500}
            aria-describedby="notes-count"
          />
          <div className="dt-notes-footer">
            <p className="dt-hint">
              Optional &mdash; share what you&apos;re comfortable with. This stays in your
              personal health record.
            </p>
            <span id="notes-count" className="dt-char-count" aria-live="polite">
              {value.notes.length}/500
            </span>
          </div>
        </div>
      </div>

      <div className="dt-actions">
        <Button type="button" variant="outline" onClick={onBack} className="dt-back">
          Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="dt-next"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}