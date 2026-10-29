"use client";
import { Search } from "lucide-react";
import { alertCategories } from "@/components/citizen/alerts/AlertCategoryBadge";
import { dateRanges } from "@/components/citizen/alerts/data";
import type { AlertCategory } from "@/types/public-alerts";
import type { AlertDateRange } from "@/components/citizen/alerts/data";
export interface AlertFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  category: AlertCategory | "all";
  onCategoryChange: (category: AlertCategory | "all") => void;
  range: AlertDateRange;
  onRangeChange: (range: AlertDateRange) => void;
  resultCount: number;
}
export function AlertFilters({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  range,
  onRangeChange,
  resultCount,
}: AlertFiltersProps) {
  return (
    <>
      <div className="al-search">
        <Search aria-hidden="true" size={18} />
        <input
          type="search"
          placeholder="Search alerts..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search alerts"
        />
      </div>
      <div className="al-chips" role="group" aria-label="Filter by category">
        <button
          type="button"
          aria-pressed={category === "all"}
          onClick={() => onCategoryChange("all")}
          className="al-chip"
        >
          All
        </button>
        {Object.entries(alertCategories).map(([key, { label, Icon }]) => (
          <button
            key={key}
            type="button"
            aria-pressed={category === key}
            onClick={() => onCategoryChange(key as AlertCategory)}
            className="al-chip"
          >
            <Icon aria-hidden="true" size={14} />
            {label}
          </button>
        ))}
      </div>
      <div className="al-daterange">
        <label htmlFor="al-date-range">Time range:</label>
        <select
          id="al-date-range"
          value={range}
          onChange={(e) => onRangeChange(e.target.value as AlertDateRange)}
        >
          {Object.entries(dateRanges).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <p className="al-count" aria-live="polite">
        {resultCount} alert{resultCount !== 1 ? "s" : ""}
      </p>
    </>
  );
}
