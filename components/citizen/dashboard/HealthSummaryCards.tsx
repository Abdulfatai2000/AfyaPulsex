import { Activity, Thermometer, TrendingUp, HeartPulse } from "lucide-react";
import type { DashboardData } from "./demo-data";
import type { LucideIcon } from "lucide-react";

interface CardConfig {
  label: string;
  value: string;
  detail: string;
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export function HealthSummaryCards({ data }: { data: DashboardData }) {
  const cards: CardConfig[] = [
    {
      label: "Symptoms This Week",
      value: String(data.symptomsThisWeek),
      detail: "Symptoms recorded",
      Icon: Activity,
      iconBg: "#fef2f2",
      iconColor: "#c63c3c",
    },
    {
      label: "Latest Temperature",
      value: data.temperature ?? "No reading yet",
      detail: "Most recent entry",
      Icon: Thermometer,
      iconBg: "#f0fdf4",
      iconColor: "#22a06b",
    },
    {
      label: "Latest Health Signal",
      value: data.signals[0]?.title ?? "No signals yet",
      detail: data.signals[0]?.date ?? "Start with your first report",
      Icon: HeartPulse,
      iconBg: "#ecfdf5",
      iconColor: "#087f8d",
    },
    {
      label: "Personal Trend",
      value: "Not enough data",
      detail: "Build your history over time",
      Icon: TrendingUp,
      iconBg: "#eff6ff",
      iconColor: "#1267e8",
    },
  ];
  return (
    <div className="db-summary">
      {cards.map(({ label, value, detail, Icon, iconBg, iconColor }) => (
        <section className="db-card db-stat" key={label}>
          <div
            className="db-stat-icon"
            style={{ background: iconBg, color: iconColor }}
          >
            <Icon aria-hidden="true" />
          </div>
          <h2>{label}</h2>
          <p className="db-value">{value}</p>
          <p className="db-muted">{detail}</p>
        </section>
      ))}
    </div>
  );
}
