import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardData, DashboardRange } from "./demo-data";

interface HealthActivityChartProps {
  data: DashboardData;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}

const RANGE_LABELS: Record<DashboardRange, string> = {
  "1w": "1 Week",
  "1m": "1 Month",
  "3m": "3 Months",
};

const RANGE_SUBTITLE: Record<DashboardRange, string> = {
  "1w": "Daily report counts",
  "1m": "Daily report counts",
  "3m": "Weekly report counts",
};

export function HealthActivityChart({ data, range, onRangeChange }: HealthActivityChartProps) {
  const total = data.activity.reduce((sum, day) => sum + day.count, 0);
  return (
    <section className="db-card db-activity" aria-labelledby="activity-title">
      <div className="db-activity-header">
        <h2 id="activity-title">Health Activity</h2>
        <div className="db-range-selector" role="group" aria-label="Time range">
          {(["1w", "1m", "3m"] as DashboardRange[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`db-range-btn ${range === r ? "active" : ""}`}
              onClick={() => onRangeChange(r)}
              aria-pressed={range === r}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
      <p className="db-muted">
        {total
          ? `${RANGE_SUBTITLE[range]} · ${data.activity.length} periods`
          : "Your reports will appear here as you build your health history."}
      </p>
      <div className="db-chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.activity}>
            <defs>
              <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1267e8" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#1267e8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eff8" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#53677f" }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#53677f" }}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #dce7f4",
                fontSize: "12px",
                boxShadow: "0 4px 16px #08214a04",
              }}
              cursor={{ stroke: "#1267e8", strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#1267e8"
              strokeWidth={2.5}
              fill="url(#activityFill)"
              dot={{
                r: 4,
                fill: "#1267e8",
                strokeWidth: 2,
                stroke: "#ffffff",
              }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="db-chart-caption">
        {total
          ? "Report counts only — not a measure of health or severity."
          : "No activity yet. Start with your first health signal."}
      </p>
    </section>
  );
}
