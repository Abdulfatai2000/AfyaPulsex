"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
export type ChartRow = {
  date: string;
  [key: string]: string | number | undefined;
};
export function HealthChart({
  rows,
  series,
  bar = false,
  unit,
  domain,
  integerCounts = false,
}: {
  rows: ChartRow[];
  series: { key: string; label: string }[];
  bar?: boolean;
  unit: string;
  domain?: [number, number];
  integerCounts?: boolean;
}) {
  const colors = [
    "#1267e8",
    "#087f8d",
    "#8b46b9",
    "#b85c0b",
    "#b83263",
    "#427a25",
  ];
  const color = (index: number) => colors[index % colors.length];
  const dash = (index: number) =>
    [undefined, "7 3", "2 3", "8 3 2 3"][Math.floor(index / colors.length) % 4];
  const points = rows.map((row) => ({
    ...row,
    timestamp: Date.parse(row.date),
  }));
  const label = (value: number) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "Africa/Lagos",
    }).format(new Date(value));
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="#e3ecf7" strokeDasharray="3 3" />
      <XAxis
        dataKey="timestamp"
        type="number"
        scale="time"
        domain={["dataMin", "dataMax"]}
        tickFormatter={label}
        padding={{ left: 20, right: 20 }}
        tickCount={5}
        tickMargin={10}
        axisLine={false}
        tickLine={false}
        minTickGap={30}
        tick={{ fontSize: 11 }}
      />
      <YAxis
        width={44}
        tickCount={5}
        axisLine={false}
        tickLine={false}
        domain={domain ?? ["auto", "auto"]}
        allowDecimals={!bar && !integerCounts}
        tick={{ fontSize: 11 }}
      />
      <Tooltip labelFormatter={(value) => label(Number(value))} />
    </>
  );
  return (
    <>
      <p className="mh-chart-axis">{unit} by recorded date (WAT)</p>
      <div
        className="mh-chart"
        role="img"
        aria-label={
          series.map((s) => s.label).join(" and ") +
          ", " +
          rows.length +
          " recorded points, " +
          unit +
          ". Text values follow."
        }
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {bar ? (
            <BarChart
              data={points}
              accessibilityLayer
              margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
            >
              {axes}
              <Bar
                name={series[0].label}
                dataKey={series[0].key}
                fill="#1267e8"
                maxBarSize={28}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          ) : (
            <LineChart
              data={points}
              accessibilityLayer
              margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
            >
              {axes}
              {series.map((s, index) => (
                <Line
                  key={s.key}
                  name={s.label}
                  dataKey={s.key}
                  type={integerCounts ? "monotoneX" : "linear"}
                  stroke={color(index)}
                  strokeDasharray={dash(index)}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <ul className="mh-chart-legend" aria-label="Chart legend">
        {series.map((s, index) => (
          <li key={s.key}>
            <svg aria-hidden="true" width="28" height="12" viewBox="0 0 28 12">
              <line
                x1="0"
                y1="6"
                x2="28"
                y2="6"
                stroke={color(index)}
                strokeWidth="2"
                strokeDasharray={dash(index)}
              />
              <circle cx="14" cy="6" r="3" fill={color(index)} />
            </svg>
            {s.label} ({unit})
          </li>
        ))}
      </ul>
      <details className="mh-chart-data">
        <summary>View chart data ({unit})</summary>
        <ul>
          {rows.map((row, index) => (
            <li key={index}>
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Africa/Lagos",
              }).format(new Date(row.date))}{" "}
              WAT — {series.map((s) => s.label + ": " + row[s.key]).join("; ")}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
