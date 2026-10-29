"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getDashboardAction } from "@/server/actions/citizen/dashboard";
import { getEmptyDashboard, type DashboardData, type DashboardRange } from "./demo-data";
import { HealthSummaryCards } from "./HealthSummaryCards";
import { HealthActivityChart } from "./HealthActivityChart";
import { RecentSignals } from "./RecentSignals";
import { CitizenLoading } from "../feedback/CitizenLoading";

export function CitizenDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>("1w");

  useEffect(() => {
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
  }, [range]);

  if (loading) {
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
      {error && (
        <div className="db-error" role="alert">
          <p>{error}</p>
        </div>
      )}
      <HealthSummaryCards data={displayData} />
      <div className="db-details">
        <HealthActivityChart data={displayData} range={range} onRangeChange={setRange} />
        <RecentSignals data={displayData} />
      </div>
    </div>
  );
}
