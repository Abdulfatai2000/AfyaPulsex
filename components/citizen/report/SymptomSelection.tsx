"use client";
import { useState, useMemo } from "react";
import { X, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";
import type { Symptom, ReportDraft } from "@/types/report";
import { SYMPTOM_LIST, isBodyAreaRelevant } from "@/types/report";

interface SymptomSelectionProps {
  value: Pick<ReportDraft, "symptoms" | "customSymptom">;
  onChange: (value: Pick<ReportDraft, "symptoms" | "customSymptom">) => void;
  error?: string;
}

export function SymptomSelection({
  value,
  onChange,
  error,
}: SymptomSelectionProps) {
  const [search, setSearch] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState(value.customSymptom);

  const filteredSymptoms = useMemo(() => {
    if (!search.trim()) return SYMPTOM_LIST;
    const lower = search.toLowerCase();
    return SYMPTOM_LIST.filter((s) => s.toLowerCase().includes(lower));
  }, [search]);

  const handleSymptomToggle = (symptom: Symptom) => {
    const newSymptoms = value.symptoms.includes(symptom)
      ? value.symptoms.filter((s) => s !== symptom)
      : [...value.symptoms, symptom];
    onChange({ ...value, symptoms: newSymptoms });
  };

  const handleCustomAdd = () => {
    const trimmed = customInput.trim();
    if (trimmed && !value.symptoms.includes(trimmed as Symptom)) {
      onChange({
        ...value,
        symptoms: [...value.symptoms, trimmed as Symptom],
        customSymptom: "",
      });
      setCustomInput("");
      setShowCustom(false);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomInput(e.target.value);
    onChange({ ...value, customSymptom: e.target.value });
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomAdd();
    }
  };

  const hasBodyArea = value.symptoms.some(isBodyAreaRelevant);

  return (
    <div className="sy-symptom-selection">
      <header className="sy-header">
        <div className="sy-title-group">
          <h2 className="sy-title">What are you experiencing?</h2>
          <p className="sy-description">
            Select all symptoms that apply. You can search or add a custom
            symptom.
          </p>
        </div>
        {hasBodyArea && (
          <span className="sy-body-area-badge">
            Body area selection will be shown next
          </span>
        )}
      </header>

      <div className="sy-search-wrapper">
        <Search className="sy-search-icon" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Search symptoms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sy-search-input"
          aria-label="Search symptoms"
        />
      </div>

      {value.symptoms.length > 0 && (
        <div className="sy-selected-chips" role="list" aria-label="Selected symptoms">
          {value.symptoms.map((symptom) => (
            <div key={symptom} className="sy-chip" role="listitem">
              <span className="sy-chip-text">{symptom}</span>
              <button
                type="button"
                className="sy-chip-remove"
                onClick={() => handleSymptomToggle(symptom)}
                aria-label={`Remove ${symptom}`}
              >
                <X className="sy-chip-remove-icon" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="sy-symptom-grid" role="listbox" aria-label="Available symptoms">
        {filteredSymptoms.map((symptom) => {
          const selected = value.symptoms.includes(symptom);
          const bodyAreaRelevant = isBodyAreaRelevant(symptom);
          return (
            <button
              key={symptom}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`${symptom}${bodyAreaRelevant ? " (body area relevant)" : ""}`}
              onClick={() => handleSymptomToggle(symptom)}
              className={cn(
                "sy-symptom-btn",
                selected && "sy-symptom-btn--selected",
                bodyAreaRelevant && "sy-symptom-btn--body-area"
              )}
            >
              <span className="sy-symptom-name">{symptom}</span>
              {bodyAreaRelevant && (
                <span className="sy-body-area-indicator" aria-hidden="true">
                  📍
                </span>
              )}
              {selected && (
                <span className="sy-check" aria-hidden="true">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sy-custom-section">
        <button
          type="button"
          className={cn("sy-custom-toggle", showCustom && "sy-custom-toggle--open")}
          onClick={() => setShowCustom(!showCustom)}
          aria-expanded={showCustom}
        >
          <Plus className="sy-custom-toggle-icon" aria-hidden="true" />
          <span>{showCustom ? "Cancel" : "Add custom symptom…"}</span>
        </button>

        {showCustom && (
          <div className="sy-custom-input-wrapper">
            <Input
              type="text"
              placeholder="Enter custom symptom"
              value={customInput}
              onChange={handleCustomChange}
              onKeyDown={handleCustomKeyDown}
              className="sy-custom-input"
              autoFocus
              aria-label="Custom symptom"
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleCustomAdd}
              disabled={!customInput.trim()}
              className="sy-custom-add-btn"
            >
              Add
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="sy-error" role="alert">
          {error}
        </p>
      )}

      <div className="sy-hint">
        {value.symptoms.length === 0
          ? "Select at least one symptom to continue"
          : `Selected: ${value.symptoms.length} symptom${
              value.symptoms.length === 1 ? "" : "s"
            }${hasBodyArea ? " · Body area step will follow" : ""}`}
      </div>
    </div>
  );
}