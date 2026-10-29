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
import { CalendarDays, Layers, TrendingUp } from "lucide-react";
import type { ReportingTrendData } from "@/lib/services/officer/analytics";
import { getReportingTrend } from "@/lib/services/officer/analytics";
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

const METRIC_TONE: Record<string, string> = {
  icon: "bg-primary-blue/10 text-primary-blue",
};

function TrendMetricCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: typeof Layers;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-off-white px-3 py-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${METRIC_TONE.icon}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <p className="text-sm font-semibold text-deep-navy">{value}</p>
      </div>
    </div>
  );
}

export function TrendAnalytics() {
  // Centralized Data Mode (live analytics has no endpoint yet → error state).
  const { mode } = useDataMode();
  const { status, data, error, retry } = useAnalyticsResource<ReportingTrendData>(
    () =>
      resolveOfficerData(mode, {
        demo: () => getReportingTrend(),
        live: () => getAnalyticsLive(),
      }),
    (result) => result.points.length === 0,
    [mode],
  );

  if (status === "error") {
    return <AnalyticsErrorState message={error} onRetry={retry} />;
  }

  return (
    <AnalyticsPanel
      title="Aggregate Reporting Trend"
      description="Daily aggregate reports vs the 7-day trailing baseline — aggregates only."
      action={
        <span className="text-[11px] text-muted-foreground">
          {data?.rangeLabel ?? "Last 30 days"}
        </span>
      }
      contentClassName="pt-2"
    >
      {status === "loading" ? (
        <AnalyticsChartSkeleton />
      ) : status === "empty" || !data ? (
        <AnalyticsEmptyState message="Aggregate trend data is currently below the privacy threshold." />
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TrendMetricCard
              label="Total reports"
              value={data.summary.totalReports.toLocaleString()}
              Icon={Layers}
            />
            <TrendMetricCard
              label="Avg / day"
              value={data.summary.avgPerDay.toLocaleString()}
              Icon={TrendingUp}
            />
            <TrendMetricCard
              label="Peak day"
              value={data.summary.peakLabel}
              Icon={CalendarDays}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary-blue" aria-hidden="true" />
              Current
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 border-t-2 border-dashed border-gray-400"
                aria-hidden="true"
              />
              Baseline (7-day)
            </span>
          </div>

          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.points}
                margin={{ top: 4, right: 6, bottom: 0, left: -14 }}
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
                  minTickGap={32}
                  dy={4}
                />
                <YAxis
                  width={44}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
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
                <Line
                  name="Current"
                  type="monotone"
                  dataKey="current"
                  stroke="#1267E8"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#1267E8", strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  name="Baseline"
                  type="monotone"
                  dataKey="baseline"
                  stroke="#9CA3AF"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Screen-reader table wrapped in a 1px clipped container (see
              SymptomAnalytics): sr-only on a <table> alone does not collapse
              its content-driven layout height. */}
          <div className="sr-only">
          <table>
            <caption>Aggregate reporting trend over the last 30 days.</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Current</th>
                <th scope="col">Baseline</th>
              </tr>
            </thead>
            <tbody>
              {data.points.map((point) => (
                <tr key={point.iso}>
                  <th scope="row">{point.label}</th>
                  <td>
                    {point.current === null ? "Suppressed" : point.current}
                  </td>
                  <td>
                    {point.baseline === null ? "Suppressed" : point.baseline}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </AnalyticsPanel>
  );
}