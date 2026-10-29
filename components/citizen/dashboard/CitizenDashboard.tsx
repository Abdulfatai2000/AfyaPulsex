"use client";
import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getDashboardAction } from "@/server/actions/citizen/dashboard";
import { getEmptyDashboard, type DashboardData, type DashboardRange } from "./demo-data";
import { HealthSummaryCards } from "./HealthSummaryCards";
import { HealthActivityChart } from "./HealthActivityChart";
import { RecentSignals } from "./RecentSignals";
import { CitizenLoading } from "../feedback/CitizenLoading";

export function CitizenDashboard({ initialData }: { initialData?: DashboardData }) {
  const [data, setData] = useState<DashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>("1w");
  const [isPending, startTransition] = useTransition();
  const isFirstMount = useRef(true);

  const handleRangeChange = (nextRange: DashboardRange) => {
    setRange(nextRange);
    startTransition(async () => {
      try {
        const result = await getDashboardAction(nextRange);
        setData(result);
        setError(null);
      } catch {
        setError("We couldn't load your dashboard. Please try again.");
      }
    });
  };

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (initialData) return;
    }
    async function load() {
      try {
        setLoading(true);
        const result = await getDashboardAction(range);
        setData(result);
      } catch {
        setError("We couldn't load your dashboard. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range, initialData]);

  if (loading && !data) {
    return (
      <div className="db-dashboard">
        <header className="db-welcome">
          <div>
            <p className="db-eyebrow">YOUR PERSONAL HEALTH OVERVIEW</p>
            <h1>Hello, welcome back</h1>
            <p>
              A little check-in today helps you keep track of your health over
              time.
            </p>
          </div>
          <Link href="/report" className="db-report">
            <Plus aria-hidden="true" size={18} />
            Report Health Signal
          </Link>
        </header>
        <CitizenLoading message="Loading your dashboard..." layout="cards" />
        <CitizenLoading message="Loading activity..." layout="chart" />
      </div>
    );
  }

  const displayData = data ?? getEmptyDashboard(range);

  return (
    <div className={`db-dashboard transition-opacity duration-150 ${isPending ? "opacity-75" : "opacity-100"}`}>
      <header className="db-welcome">
        <div>
          <p className="db-eyebrow">YOUR PERSONAL HEALTH OVERVIEW</p>
          <h1>Hello, welcome back</h1>
          <p>
            A little check-in today helps you keep track of your health over
            time.
          </p>
        </div>
        <Link href="/report" className="db-report">
          <Plus aria-hidden="true" size={18} />
          Report Health Signal
        </Link>
      </header>
      {error && (
        <div className="db-error" role="alert">
          <p>{error}</p>
        </div>
      )}
      <HealthSummaryCards data={displayData} />
      <div className="db-details">
        <HealthActivityChart data={displayData} range={range} onRangeChange={handleRangeChange} />
        <RecentSignals data={displayData} />
      </div>
    </div>
  );
}
