"use client";

import { useId, useMemo } from "react";
import type { MapFilters } from "@/lib/services/officer/map";
import {
  SYMPTOM_OPTIONS,
  AGE_GROUP_OPTIONS,
  AGE_GROUP_LABELS,
  SEX_OPTIONS,
  SEX_LABELS,
  SEVERITY_OPTIONS,
  SEVERITY_LABELS,
  REPORT_TYPE_OPTIONS,
  REPORT_TYPE_LABELS,
  TIME_RANGE_OPTIONS,
} from "@/lib/services/officer/map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { OfficerMapScope } from "@/lib/services/officer/map-scope";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";

interface Props {
  scope: OfficerMapScope;
  value: MapFilters;
  onChange: (value: MapFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder = "All",
  disabled = false,
}: {
  label: string;
  value: string;
  onValueChange: (value: string | null) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-medium text-gray-600">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className="w-full rounded-lg border-gray-200 text-sm"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="" className="text-xs">
            {placeholder}
          </SelectItem>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-xs"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function MapFilters({
  scope,
  value,
  onChange,
  onApply,
  onReset,
}: Props) {
  const { mode } = useDataMode();
  const unsupported = mode === "live";
  const states = scope.states;
  const lgas = states.find((state) => state.id === value.stateId)?.lgas ?? [];
  const conditionId = useId();

  const symptomOptions = useMemo(
    () => SYMPTOM_OPTIONS.map((s) => ({ value: s, label: s })),
    [],
  );

  const ageOptions = useMemo(
    () =>
      AGE_GROUP_OPTIONS.map((a) => ({ value: a, label: AGE_GROUP_LABELS[a] })),
    [],
  );

  const sexOptions = useMemo(
    () => SEX_OPTIONS.map((s) => ({ value: s, label: SEX_LABELS[s] })),
    [],
  );

  const severityOptions = useMemo(
    () =>
      SEVERITY_OPTIONS.map((s) => ({ value: s, label: SEVERITY_LABELS[s] })),
    [],
  );

  const reportTypeOptions = useMemo(
    () =>
      REPORT_TYPE_OPTIONS.map((r) => ({
        value: r,
        label: REPORT_TYPE_LABELS[r],
      })),
    [],
  );

  const update = (patch: Partial<MapFilters>) =>
    onChange({ ...value, ...patch });

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

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-1">
      <p className="text-xs font-semibold text-[#08214A]">Filters</p>

      <div className="flex flex-col gap-3">
        <SelectField
          label="State"
          value={value.stateId}
          onValueChange={handleStateChange}
          options={stateOptions}
          disabled={scope.level !== "country"}
          placeholder={
            scope.level === "country" ? "All authorized States" : scope.label
          }
        />
        <SelectField
          label="LGA"
          value={value.lgaId}
          onValueChange={(lgaId) => update({ lgaId: lgaId ?? "" })}
          options={lgaOptions}
          disabled={scope.level === "lga" || !value.stateId}
          placeholder={
            scope.level === "lga" ? scope.label : "All authorized LGAs"
          }
        />
        {unsupported && (
          <p className="text-gray-500">
            Live signals support location, time and activity filters. Disease
            and demographic breakdowns are not available in the approved
            aggregate data.
          </p>
        )}

        <SelectField
          label="Symptom"
          disabled={unsupported}
          value={value.symptom}
          onValueChange={(symptom) => update({ symptom: symptom ?? "" })}
          options={symptomOptions}
          placeholder="Any symptom"
        />

        <div>
          <label
            htmlFor={conditionId}
            className="mb-2 block font-medium text-gray-600"
          >
            Health Condition
          </label>
          <input
            id={conditionId}
            disabled={unsupported}
            type="text"
            value={value.healthCondition}
            onChange={(e) => update({ healthCondition: e.target.value })}
            placeholder="e.g. malaria"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#1267E8]/50"
          />
        </div>

        <SelectField
          label="Age Group"
          disabled={unsupported}
          value={value.ageGroup}
          onValueChange={(ageGroup) =>
            update({ ageGroup: (ageGroup ?? "") as MapFilters["ageGroup"] })
          }
          options={ageOptions}
          placeholder="All"
        />

        <SelectField
          label="Sex"
          disabled={unsupported}
          value={value.sex}
          onValueChange={(sex) =>
            update({ sex: (sex ?? "") as MapFilters["sex"] })
          }
          options={sexOptions}
          placeholder="All"
        />

        <SelectField
          label="Time Range"
          value={value.timeRange}
          onValueChange={(timeRange) =>
            update({ timeRange: (timeRange ?? "") as MapFilters["timeRange"] })
          }
          options={TIME_RANGE_OPTIONS}
          placeholder="Select range"
        />

        <SelectField
          label="Activity level"
          value={value.severity}
          onValueChange={(severity) =>
            update({ severity: (severity ?? "") as MapFilters["severity"] })
          }
          options={severityOptions}
          placeholder="All"
        />

        <SelectField
          label="Report Type"
          disabled={unsupported}
          value={value.reportType}
          onValueChange={(reportType) =>
            update({
              reportType: (reportType ?? "") as MapFilters["reportType"],
            })
          }
          options={reportTypeOptions}
          placeholder="All"
        />
      </div>

      <div className="mt-auto flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={onReset}
          type="button"
        >
          Reset
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs"
          onClick={onApply}
          type="button"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
