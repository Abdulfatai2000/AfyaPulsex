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
import type { InvestigationTrendPoint } from "@/lib/services/officer/investigations";
import { formatInvestigationDate } from "@/lib/services/officer/investigations";

/**
 * Aggregate trend chart (last 14 days). Current vs baseline, derived from the
 * investigation service — aggregate daily counts only, never individual
 * reports. The chart is complemented by a visually-hidden data table so the
 * same values are available to screen readers.
 */
export function InvestigationTrendChart({
  points,
}: {
  points: InvestigationTrendPoint[];
}) {
  return (
    <section
      className="rounded-xl border border-border bg-white p-4"
      aria-label="Aggregate trend, last 14 days"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-deep-navy">
            Trend (Last 14 Days)
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Aggregate daily signal counts vs baseline for this jurisdiction
            area — never individual records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary-blue" aria-hidden="true" />
            Current
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4 border-t-2 border-dashed border-gray-400"
              aria-hidden="true"
            />
            Baseline
          </span>
        </div>
      </div>

      <div className="mt-3 h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
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
              minTickGap={20}
              dy={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6B7280" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E5E7EB",
                fontSize: 12,
                boxShadow: "0 1px 3px rgba(8,33,74,0.08)",
              }}
            />
            <Line
              name="Current"
              type="monotone"
              dataKey="current"
              stroke="#1267E8"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#1267E8", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
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
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Screen-reader table wrapped in a 1px clipped container: sr-only on
          a <table> alone does not collapse its content-driven layout height,
          leaking a tall box into the document scrollable overflow. */}
      <div className="sr-only">
      <table>
        <caption>
          Aggregate daily signals, last 14 days, current versus baseline.
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Current</th>
            <th scope="col">Baseline</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatInvestigationDate(point.date)}</th>
              <td>{point.current}</td>
              <td>{point.baseline}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}