"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Filter, Search } from "lucide-react";
import { cn } from "@/server/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NIGERIA_STATES, NIGERIA_STATES_LGAS } from "@/lib/data/nigeria-states-lgas";
import {
  HEALTH_CONDITION_OPTIONS,
  SEVERITY_LABELS,
  SEVERITY_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  TIME_RANGE_OPTIONS,
  type WarningFilters,
  type WarningSeverity,
  type WarningStatus,
  type WarningTimeRange,
} from "@/lib/services/officer/warnings";

interface Props {
  value: WarningFilters;
  onChange: (value: WarningFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Field id={id} label={label}>
      <Select value={value} onValueChange={(next) => onValueChange(next ?? "")}>
        <SelectTrigger
          id={id}
          className="h-8 w-full rounded-lg border-gray-200 text-xs"
          aria-label={label}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function WarningFilters({ value, onChange, onApply, onReset }: Props) {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<WarningFilters>) =>
    onChange({ ...value, ...patch });

  const stateOptions = useMemo(
    () => [
      { value: "", label: "All states" },
      ...NIGERIA_STATES.map((s) => ({ value: s, label: s })),
    ],
    [],
  );

  const lgaOptions = useMemo(() => {
    const lgas = NIGERIA_STATES_LGAS[value.state] ?? [];
    return [
      { value: "", label: "All LGAs" },
      ...lgas.map((lga) => ({ value: lga, label: lga })),
    ];
  }, [value.state]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      ...STATUS_OPTIONS.map((s) => ({
        value: s.value,
        label: STATUS_LABELS[s.value],
      })),
    ],
    [],
  );

  const severityOptions = useMemo(
    () => [
      { value: "all", label: "All severities" },
      ...SEVERITY_OPTIONS.map((s) => ({
        value: s.value,
        label: SEVERITY_LABELS[s.value],
      })),
    ],
    [],
  );

  const conditionOptions = useMemo(
    () => [
      { value: "", label: "All conditions" },
      ...HEALTH_CONDITION_OPTIONS.map((c) => ({ value: c, label: c })),
    ],
    [],
  );

  const handleStateChange = (state: string) => {
    update({ state, lga: "" });
  };

  return (
    <section
      aria-labelledby="warning-filters-heading"
      className="min-w-0 rounded-xl border border-border bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 id="warning-filters-heading" className="text-sm font-semibold text-deep-navy">
          Filters
        </h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="warning-filters-panel"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary-blue outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/60 lg:hidden"
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          {open ? "Hide filters" : "Show filters"}
        </button>
      </div>

      <div
        id="warning-filters-panel"
        className={cn("p-4", !open && "hidden lg:block")}
      >
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <SelectField
            id="warning-filter-status"
            label="Status"
            value={value.status}
            onValueChange={(status) =>
              update({ status: (status || "all") as WarningStatus | "all" })
            }
            placeholder="All statuses"
            options={statusOptions}
          />

          <SelectField
            id="warning-filter-state"
            label="State"
            value={value.state}
            onValueChange={handleStateChange}
            placeholder="All states"
            options={stateOptions}
          />

          <SelectField
            id="warning-filter-lga"
            label="LGA"
            value={value.lga}
            onValueChange={(lga) => update({ lga })}
            placeholder={value.state ? "All LGAs" : "Select state first"}
            options={lgaOptions}
          />

          <SelectField
            id="warning-filter-condition"
            label="Health Condition"
            value={value.healthCondition}
            onValueChange={(healthCondition) => update({ healthCondition })}
            placeholder="All conditions"
            options={conditionOptions}
          />

          <SelectField
            id="warning-filter-time-range"
            label="Time Period"
            value={value.timeRange}
            onValueChange={(timeRange) =>
              update({ timeRange: (timeRange || "7d") as WarningTimeRange })
            }
            placeholder="Select period"
            options={TIME_RANGE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />

          <SelectField
            id="warning-filter-severity"
            label="Severity"
            value={value.severity}
            onValueChange={(severity) =>
              update({ severity: (severity || "all") as WarningSeverity | "all" })
            }
            placeholder="All severities"
            options={severityOptions}
          />

          <Field id="warning-filter-search" label="Search">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="warning-filter-search"
                type="search"
                placeholder="Search warnings, areas…"
                className="h-8 rounded-lg border-gray-200 pl-8 text-xs"
                value={value.search}
                onChange={(e) => update({ search: e.target.value })}
              />
            </div>
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onReset}
            type="button"
          >
            Reset
          </Button>
          <Button size="sm" className="text-xs" onClick={onApply} type="button">
            Apply Filters
          </Button>
        </div>
      </div>
    </section>
  );
}