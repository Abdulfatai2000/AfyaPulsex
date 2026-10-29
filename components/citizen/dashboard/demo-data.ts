export interface DashboardSignal {
  id: string;
  title: string;
  date: string;
  status: string;
}
export interface DashboardData {
  symptomsThisWeek: number;
  temperature: string | null;
  activity: { label: string; count: number }[];
  signals: DashboardSignal[];
}
export type DashboardRange = "1w" | "1m" | "3m";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function generateEmptyActivity(range: DashboardRange): { label: string; count: number }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const DAY_MS = 24 * 60 * 60 * 1000;
  const activity: { label: string; count: number }[] = [];

  if (range === "1w") {
    for (let i = 6; i >= 0; i -= 1) {
      const start = todayStart.getTime() - i * DAY_MS;
      activity.push({
        label: new Date(start).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
        count: 0,
      });
    }
  } else if (range === "1m") {
    const daysInMonth = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0).getDate();
    const startOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    for (let i = 0; i < daysInMonth; i += 1) {
      const start = startOfMonth.getTime() + i * DAY_MS;
      if (start > todayStart.getTime()) break;
      activity.push({
        label: new Date(start).toLocaleString("en-GB", { day: "numeric", month: "short" }),
        count: 0,
      });
    }
  } else if (range === "3m") {
    const endDate = todayStart;
    const startDate = new Date(todayStart.getFullYear(), todayStart.getMonth() - 2, 1);
    let current = new Date(startDate);
    while (current <= endDate) {
      const weekStart = new Date(current);
      weekStart.setDate(current.getDate() - current.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      if (weekStart.getTime() > endDate.getTime()) break;
      activity.push({
        label: weekStart.toLocaleString("en-GB", { month: "short", year: "2-digit" }),
        count: 0,
      });
      current = weekEnd;
    }
  }

  return activity;
}

export const demoDashboard: DashboardData = {
  symptomsThisWeek: 3,
  temperature: "36.8 °C",
  activity: [
    { label: "Mon", count: 2 },
    { label: "Tue", count: 4 },
    { label: "Wed", count: 1 },
    { label: "Thu", count: 5 },
    { label: "Fri", count: 3 },
    { label: "Sat", count: 6 },
    { label: "Sun", count: 4 },
  ],
  signals: [
    { id: "demo-1", title: "Headache", date: "20 Sep · 10:30 AM", status: "Mild" },
    { id: "demo-2", title: "Cough", date: "19 Sep · 2:12 PM", status: "Moderate" },
    { id: "demo-3", title: "Fatigue", date: "18 Sep · 8:20 AM", status: "Mild" },
  ],
};

export function getEmptyDashboard(range: DashboardRange = "1w"): DashboardData {
  return {
    symptomsThisWeek: 0,
    temperature: null,
    signals: [],
    activity: generateEmptyActivity(range),
  };
}
