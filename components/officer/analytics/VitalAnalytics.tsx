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
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { VitalAnalyticsData, VitalTrendPoint } from "@/lib/services/officer/analytics";
import { getVitalAnalytics } from "@/lib/services/officer/analytics";
import { resolveOfficerData } from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getAnalyticsLive } from "@/lib/services/officer/live-adapters";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { useAnalyticsResource } from "./useAnalyticsResource";
import {
  AnalyticsChartSkeleton,
  AnalyticsEmptyState,
  AnalyticsErrorState,
} from "./AnalyticsStates";

function SummaryChange({ changePct }: { changePct: number | null }) {
  if (changePct === null) {
    return <span className="text-[11px] text-gray-400">n/a</span>;
  }
  const up = changePct > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
        up ? "text-danger-red" : "text-success-green"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {up ? "+" : ""}
      {changePct}%
    </span>
  );
}

function VitalSummaryCard({
  label,
  value,
  unit,
  changePct,
}: {
  label: string;
  value: number | null;
  unit: string;
  changePct: number | null;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-off-white px-3 py-2.5">
      <p className="truncate text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold text-deep-navy">
        {value === null ? (
          <span className="text-sm font-medium text-warning-amber">
            Insufficient
          </span>
        ) : (
          <>
            {value}
            <span className="ml-1 text-xs font-normal text-gray-400">{unit}</span>
          </>
        )}
      </p>
      <div className="mt-0.5">
        <SummaryChange changePct={changePct} />
      </div>
    </div>
  );
}

function VitalLineChart({
  title,
  dataKey,
  color,
  unit,
  data,
  formatValue,
  srLabel,
}: {
  title: string;
  dataKey: "temperature" | "heartRate" | "spo2";
  color: string;
  unit: string;
  data: VitalTrendPoint[];
  formatValue: (value: number | null) => string;
  srLabel: string;
}) {
  return (
    <section className="rounded-lg border border-gray-100 p-3" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-deep-navy">{title}</h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-gray-500">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          Daily average ({unit})
        </span>
      </div>
      <div className="mt-2 h-44 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "#6B7280" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              minTickGap={24}
              dy={4}
            />
            <YAxis
              width={44}
              tick={{ fontSize: 9, fill: "#6B7280" }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
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
              formatter={(value: unknown) => {
                const num =
                  typeof value === "number" ? value : Number(value);
                return [formatValue(Number.isNaN(num) ? null : num), "Average"];
              }}
            />
            <Line
              name={title}
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 2, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Screen-reader table wrapped in a 1px clipped container (see
          SymptomAnalytics): sr-only on a <table> alone does not collapse its
          content-driven layout height. */}
      <div className="sr-only">
      <table>
        <caption>{srLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Average</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.iso}>
              <th scope="row">{point.label}</th>
              <td>{formatValue(point[dataKey])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}

export function VitalAnalytics() {
  // Centralized Data Mode (live analytics has no endpoint yet → error state).
  const { mode } = useDataMode();
  const { status, data, error, retry } = useAnalyticsResource<VitalAnalyticsData>(
    () =>
      resolveOfficerData(mode, {
        demo: () => getVitalAnalytics(),
        live: () => getAnalyticsLive(),
      }),
    (result) => result.trend.length === 0,
    [mode],
  );

  if (status === "error") {
    return <AnalyticsErrorState message={error} onRetry={retry} />;
  }

  return (
    <AnalyticsPanel
      title="Vitals"
      description="Aggregate daily averages across community vital readings — never individual measurements."
      action={
        <span className="text-[11px] text-muted-foreground">
          {data?.rangeLabel ?? "Last 14 days"}
        </span>
      }
      contentClassName="pt-2"
    >
      {status === "loading" ? (
        <AnalyticsChartSkeleton />
      ) : status === "empty" || !data ? (
        <AnalyticsEmptyState message="Aggregate vital averages are currently below the privacy threshold." />
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {data.summary.map((metric) => (
              <VitalSummaryCard
                key={metric.id}
                label={metric.label}
                value={metric.value}
                unit={metric.unit}
                changePct={metric.changePct}
              />
            ))}
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <VitalLineChart
              title="Average temperature"
              dataKey="temperature"
              color="#1267E8"
              unit="°C"
              data={data.trend}
              formatValue={(v) => (v === null ? "Suppressed" : `${v}°C`)}
              srLabel="Daily average temperature, last 14 days."
            />
            <VitalLineChart
              title="Average heart rate"
              dataKey="heartRate"
              color="#20BFD0"
              unit="bpm"
              data={data.trend}
              formatValue={(v) => (v === null ? "Suppressed" : `${v} bpm`)}
              srLabel="Daily average heart rate, last 14 days."
            />
          </div>
        </div>
      )}
    </AnalyticsPanel>
  );
}