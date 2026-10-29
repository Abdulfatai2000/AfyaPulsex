"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  SymptomCombination,
  SymptomTrendData,
  SymptomTrendSeries,
} from "@/lib/services/officer/analytics";
import {
  getSymptomCombinations,
  getSymptomTrendData,
  SYMPTOM_TREND_SERIES,
} from "@/lib/services/officer/analytics";
import { resolveOfficerData } from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getAnalyticsLive } from "@/lib/services/officer/live-adapters";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { useAnalyticsResource } from "./useAnalyticsResource";
import {
  AnalyticsChartSkeleton,
  AnalyticsEmptyState,
  AnalyticsErrorState,
  AnalyticsPanelSkeleton,
} from "./AnalyticsStates";

interface TrendRow {
  label: string;
  [symptom: string]: string | number | null;
}

function buildTrendRows(data: SymptomTrendData): TrendRow[] {
  return data.dates.map((date, index) => {
    const row: TrendRow = { label: date.label };
    for (const series of data.series) {
      row[series.symptom] = series.values[index];
    }
    return row;
  });
}

function hasSeriesData(series: SymptomTrendSeries): boolean {
  return series.values.some((v) => v !== null);
}

/**
 * Symptom Trends (Last 14 Days) — the primary Analytics chart. Renders every
 * symptom series received from the analytics service (currently Fever, Cough,
 * Headache and Diarrhea preview data). Daily aggregate counts only; never
 * individual records.
 */
function SymptomTrendChart({ data }: { data: SymptomTrendData }) {
  const rows = buildTrendRows(data);
  const visibleSeries = data.series.filter(hasSeriesData);

  if (visibleSeries.length === 0) {
    return (
      <AnalyticsEmptyState message="Aggregate symptom counts are currently below the privacy threshold." />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" role="list">
        {SYMPTOM_TREND_SERIES.filter((entry) =>
          data.series.some((s) => s.symptom === entry.symptom),
        ).map((entry) => {
          const series = data.series.find((s) => s.symptom === entry.symptom);
          const latest =
            series && series.values[series.values.length - 1] !== null
              ? series.values[series.values.length - 1]
              : null;
          return (
            <span
              key={entry.symptom}
              role="listitem"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              {entry.symptom}
              {latest !== null ? (
                <span className="font-semibold text-deep-navy">{latest}</span>
              ) : null}
            </span>
          );
        })}
      </div>

      <div className="mt-3 h-64 w-full min-w-0 [&_.recharts-surface]:focus-visible:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 6, right: 6, bottom: 0, left: -14 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="#E5E7EB"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#6B7280" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              minTickGap={24}
              dy={4}
            />
            <YAxis
              width={44}
              tick={{ fontSize: 10, fill: "#6B7280" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              label={{
                value: "Reports",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 10, fill: "#9CA3AF", textAnchor: "middle" },
                offset: 26,
              }}
            />
            <Tooltip
              cursor={{ stroke: "#CBD5E1", strokeDasharray: "3 3" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E5E7EB",
                fontSize: 12,
                boxShadow: "0 1px 3px rgba(8,33,74,0.08)",
              }}
              labelStyle={{ fontWeight: 600, color: "#08214A" }}
            />
            {SYMPTOM_TREND_SERIES.filter((entry) => hasSeriesData(
              data.series.find((s) => s.symptom === entry.symptom) as SymptomTrendSeries,
            )).map((entry) => (
              <Line
                key={entry.symptom}
                name={entry.symptom}
                type="monotone"
                dataKey={entry.symptom}
                stroke={entry.color}
                strokeWidth={2}
                dot={{ r: 2.5, fill: entry.color, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Screen-reader accessible rendering of the same daily aggregates.
          Wrapped in a 1px clipped container: sr-only directly on a <table>
          does not collapse its content-driven layout height, leaking a
          300px+ box into the document scrollable overflow. */}
      <div className="sr-only">
      <table>
        <caption>Aggregate daily symptom reports, last 14 days.</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {data.series.map((series) => (
              <th key={series.symptom} scope="col">
                {series.symptom}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={data.dates[index].iso}>
              <th scope="row">{row.label}</th>
              {data.series.map((series) => (
                <td key={series.symptom}>
                  {row[series.symptom] === null
                    ? "Suppressed"
                    : String(row[series.symptom])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function ruleOfThumbPct(count: number | null, max: number): number {
  if (count === null || max <= 0) {
    return 0;
  }
  return Math.max(6, Math.round((count / max) * 100));
}

function TopSymptomCombinations({ combinations }: { combinations: SymptomCombination[] }) {
  if (combinations.length === 0) {
    return (
      <AnalyticsEmptyState message="No co-occurring symptom combinations were found for this window." />
    );
  }
  const max = Math.max(...combinations.map((c) => c.count ?? 0), 1);

  return (
    <ol className="flex flex-col" aria-label="Top symptom combinations">
      {combinations.map((combo) => (
        <li
          key={combo.rank}
          className="flex items-center gap-3 border-b border-gray-50 py-2.5 last:border-0"
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-blue/10 text-[11px] font-semibold text-primary-blue"
            aria-hidden="true"
          >
            {combo.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-deep-navy">
              {combo.label}
            </p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
              <div
                className="h-full rounded-full bg-primary-blue/60"
                style={{ width: `${ruleOfThumbPct(combo.count, max)}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-deep-navy">
            {combo.count === null ? "—" : combo.count.toLocaleString()}
          </span>
          <span className="sr-only">aggregate reports</span>
        </li>
      ))}
    </ol>
  );
}

export function SymptomAnalytics() {
  // Centralized Data Mode (live analytics has no endpoint yet → error state).
  const { mode } = useDataMode();
  const trend = useAnalyticsResource<SymptomTrendData>(
    () =>
      resolveOfficerData(mode, {
        demo: () => getSymptomTrendData(),
        live: () => getAnalyticsLive(),
      }),
    () => false,
    [mode],
  );
  const combos = useAnalyticsResource<SymptomCombination[]>(
    () =>
      resolveOfficerData(mode, {
        demo: () => getSymptomCombinations(),
        live: () => getAnalyticsLive(),
      }),
    (data) => data.length === 0,
    [mode],
  );

  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <AnalyticsPanel
        title="Symptom Trends (Last 14 Days)"
        description="Aggregate daily symptom reports in your jurisdiction — never individual records."
        contentClassName="pt-2"
      >
        {trend.status === "error" ? (
          <AnalyticsErrorState message={trend.error} onRetry={trend.retry} />
        ) : trend.status === "empty" ? (
          <AnalyticsEmptyState message="Aggregate symptom counts are currently below the privacy threshold." />
        ) : trend.data ? (
          <SymptomTrendChart data={trend.data} />
        ) : (
          <AnalyticsChartSkeleton />
        )}
      </AnalyticsPanel>

      <AnalyticsPanel
        title="Top Symptom Combinations"
        description="Most common pairs reported within the same episode."
        contentClassName="pt-2"
      >
        {combos.status === "error" ? (
          <AnalyticsErrorState message={combos.error} onRetry={combos.retry} />
        ) : combos.data ? (
          <TopSymptomCombinations combinations={combos.data} />
        ) : (
          <AnalyticsPanelSkeleton rows={5} />
        )}
      </AnalyticsPanel>
    </div>
  );
}