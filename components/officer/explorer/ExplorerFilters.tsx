"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Search, SlidersHorizontal, X } from "lucide-react";
import type { ExplorerFilters } from "@/lib/services/officer/explorer";
import {
  AGE_GROUP_LABELS,
  AGE_GROUP_OPTIONS,
  COMPARE_WITH_OPTIONS,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_OPTIONS,
  SEVERITY_LABELS,
  SEVERITY_OPTIONS,
  SEX_LABELS,
  SEX_OPTIONS,
  SYMPTOM_OPTIONS,
  TIME_RANGE_OPTIONS,
} from "@/lib/services/officer/explorer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/server/lib/utils";
import { Button } from "@/components/ui/button";
import { geographyService } from "@/lib/services/officer/geography";
import type {
  GeographyLga,
  GeographyState,
} from "@/lib/services/officer/geography";

interface Props {
  value: ExplorerFilters;
  onChange: (value: ExplorerFilters) => void;
  /** Run the search with the current filters (the Search Signals action). */
  onSearch: () => void;
  onReset: () => void;
  /** Persist the current filters as a saved query. Resolves true on success. */
  onSaveQuery: (name: string) => Promise<boolean>;
}

function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder = "All",
}: {
  label: string;
  value: string;
  onValueChange: (value: string | null) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-9 w-full rounded-lg border-gray-200 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="" className="text-xs">
            {placeholder}
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Build Query form (matches the Signal Explorer design): a two-column query
 * builder with Location, Health Condition, Age Group, Sex, Time Period,
 * Symptoms, Severity, and Compare with, plus Advanced Filters and a large
 * Search Signals action. Location is data-driven through the shared geography
 * service so impossible State/LGA pairings never reach the explorer service.
 */
export function ExplorerFilters({
  value,
  onChange,
  onSearch,
  onReset,
  onSaveQuery,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [queryName, setQueryName] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const symptomOptions = useMemo(
    () => [
      { value: "", label: "Any symptom" },
      ...SYMPTOM_OPTIONS.map((s) => ({ value: s, label: s })),
    ],
    [],
  );

  const ageOptions = useMemo(
    () => AGE_GROUP_OPTIONS.map((a) => ({ value: a, label: AGE_GROUP_LABELS[a] })),
    [],
  );

  const sexOptions = useMemo(
    () => SEX_OPTIONS.map((s) => ({ value: s, label: SEX_LABELS[s] })),
    [],
  );

  const severityOptions = useMemo(
    () => SEVERITY_OPTIONS.map((s) => ({ value: s, label: SEVERITY_LABELS[s] })),
    [],
  );

  const reportTypeOptions = useMemo(
    () => REPORT_TYPE_OPTIONS.map((r) => ({ value: r, label: REPORT_TYPE_LABELS[r] })),
    [],
  );

  const update = (patch: Partial<ExplorerFilters>) =>
    onChange({ ...value, ...patch });

  // Location dropdowns are data-driven through the shared geography service
  // (same State → LGA pattern as the Signal Map — no second list). LGA
  // options follow the selected State; changing State resets the LGA so
  // invalid State/LGA combinations can never be submitted (the explorer
  // service + backend boundary still validate structurally).
  const [states, setStates] = useState<readonly GeographyState[]>([]);
  const [lgas, setLgas] = useState<readonly GeographyLga[]>([]);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    geographyService
      .getStates()
      .then((loaded) => {
        if (!cancelled) {
          setStates(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeoError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const task = value.stateId
      ? geographyService.getLgasByState(value.stateId)
      : Promise.resolve([] as readonly GeographyLga[]);
    task
      .then((loaded) => {
        if (!cancelled) {
          setLgas(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeoError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [value.stateId]);

  const handleStateChange = (stateId: string | null) =>
    update({ stateId: stateId ?? "", lgaId: "" });

  const stateOptions = useMemo(
    () => states.map((s) => ({ value: s.id, label: s.name })),
    [states],
  );

  const lgaOptions = useMemo(
    () => lgas.map((l) => ({ value: l.id, label: `${l.name} LGA` })),
    [lgas],
  );

  const handleSave = async () => {
    const name = queryName.trim();
    if (!name) {
      return;
    }
    setSaveState("saving");
    const ok = await onSaveQuery(name);
    setSaveState(ok ? "saved" : "idle");
    if (ok) {
      setQueryName("");
      window.setTimeout(() => setSaveState("idle"), 2000);
    }
    setSaving(false);
  };

  // Field order pairs the screenshot's two columns: row-major DOM order with
  // two grid columns yields Location/Health Condition/Age Group/Sex on the
  // left and Time Period/Symptoms/Severity/Compare with on the right.
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Location — State dropdown plus dependent LGA dropdown, both
            resolved through the shared geography service. */}
        <div className="flex min-w-0 flex-col gap-4">
          <SelectField
            label="State"
            value={value.stateId}
            onValueChange={handleStateChange}
            options={stateOptions}
            placeholder={geoError ? "Unavailable" : "Select state"}
          />
          <SelectField
            label="Local Government Area"
            value={value.lgaId}
            onValueChange={(lgaId) => update({ lgaId: lgaId ?? "" })}
            options={lgaOptions}
            placeholder={
              !value.stateId ? "Select a state first" : "Entire state"
            }
          />
          {geoError ? (
            <p role="alert" className="text-[11px] leading-snug text-danger-red">
              Location options could not be loaded. You can still use the
              remaining filters.
            </p>
          ) : null}
        </div>

        <SelectField
          label="Time Period"
          value={value.timeRange}
          onValueChange={(timeRange) =>
            update({ timeRange: (timeRange ?? "") as ExplorerFilters["timeRange"] })
          }
          options={TIME_RANGE_OPTIONS}
          placeholder="Select range"
        />

        <div>
          <label
            htmlFor="explorer-health-condition"
            className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-gray-500"
          >
            Health Condition
          </label>
          <input
            id="explorer-health-condition"
            type="text"
            value={value.healthCondition}
            onChange={(e) => update({ healthCondition: e.target.value })}
            placeholder="e.g. malaria"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#1267E8]/50"
          />
        </div>

        <SelectField
          label="Symptoms"
          value={value.symptom}
          onValueChange={(symptom) => update({ symptom: symptom ?? "" })}
          options={symptomOptions}
          placeholder="Any symptom"
        />

        <SelectField
          label="Age Group"
          value={value.ageGroup}
          onValueChange={(ageGroup) =>
            update({ ageGroup: (ageGroup ?? "") as ExplorerFilters["ageGroup"] })
          }
          options={ageOptions}
          placeholder="All"
        />

        <SelectField
          label="Severity"
          value={value.severity}
          onValueChange={(severity) =>
            update({ severity: (severity ?? "") as ExplorerFilters["severity"] })
          }
          options={severityOptions}
          placeholder="All"
        />

        <SelectField
          label="Sex"
          value={value.sex}
          onValueChange={(sex) => update({ sex: (sex ?? "") as ExplorerFilters["sex"] })}
          options={sexOptions}
          placeholder="All"
        />

        <SelectField
          label="Compare with"
          value={value.compareWith}
          onValueChange={(compareWith) =>
            update({
              compareWith: (
                (compareWith ?? "none") as ExplorerFilters["compareWith"]
              ),
            })
          }
          options={COMPARE_WITH_OPTIONS}
          placeholder="None"
        />
      </div>

      {advancedOpen && (
        <div
          id="explorer-advanced-filters"
          className="border-t border-gray-100 pt-4"
        >
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Report Type (Advanced)"
              value={value.reportType}
              onValueChange={(reportType) =>
                update({ reportType: (reportType ?? "") as ExplorerFilters["reportType"] })
              }
              options={reportTypeOptions}
              placeholder="All"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setAdvancedOpen((open) => !open)}
            type="button"
            aria-expanded={advancedOpen}
            aria-controls="explorer-advanced-filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Advanced Filters
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500"
            onClick={onReset}
            type="button"
          >
            Reset
          </Button>

          {saving ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
              }}
            >
              <label htmlFor="explorer-save-name" className="sr-only">
                Query name
              </label>
              <input
                id="explorer-save-name"
                type="text"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                placeholder="Name this query"
                className="h-8 w-48 rounded-lg border border-gray-200 px-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1267E8]/50"
              />
              <Button
                size="sm"
                className="text-xs"
                type="submit"
                disabled={saveState === "saving" || !queryName.trim()}
              >
                {saveState === "saved" ? "Saved" : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                type="button"
                onClick={() => {
                  setSaving(false);
                  setQueryName("");
                }}
                aria-label="Cancel save"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </form>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setSaving(true)}
              type="button"
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              Save query
            </Button>
          )}
        </div>

        <Button
          size="lg"
          className={cn("text-sm", "w-full sm:w-auto")}
          onClick={onSearch}
          type="button"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search Signals
        </Button>
      </div>
    </div>
  );
}