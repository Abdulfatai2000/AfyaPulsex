"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Timeframe } from "@/lib/services/officer/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEFRAME_OPTIONS: ReadonlyArray<{ value: Timeframe; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
];

interface Props {
  children: React.ReactNode;
  officerName?: string;
  jurisdiction?: string;
  timeframe: Timeframe;
}

export function getTimeBasedGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }
  if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  }
  if (hour >= 17 && hour < 21) {
    return "Good evening";
  }
  return "Good night";
}

export default function OverviewDashboard({
  children,
  officerName,
  jurisdiction,
  timeframe,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Timeframe selection re-fetches the server-rendered widgets by navigating to
  // ?timeframe=<value>, which re-runs the route's async data fetching (all data
  // still flows through the service layer — no numbers live in this component).
  const handleTimeframeChange = (value: string | null) => {
    if (!value || value === timeframe) {
      return;
    }
    startTransition(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("timeframe", value);
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    });
  };

  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const hour = new Date().getHours();
  const greeting = getTimeBasedGreeting(hour);
  const displayName = officerName?.trim() ? officerName.trim() : "Officer";

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* Greeting + jurisdiction + timeframe */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-deep-navy">
            {greeting}, {displayName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Authorized jurisdiction: {jurisdiction ?? "Ife Central LGA"} · {today}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <label
            htmlFor="timeframe-select"
            className="sr-only text-xs text-muted-foreground"
          >
            Dashboard timeframe
          </label>
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger
              id="timeframe-select"
              className="w-40"
              aria-label="Select timeframe for dashboard data"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {TIMEFRAME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pending state while the server re-renders for the new timeframe */}
      <div role="status" aria-live="polite" aria-busy={isPending}>
        {isPending ? (
          <p className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-primary-blue">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Updating dashboard for{" "}
            {TIMEFRAME_OPTIONS.find((o) => o.value === timeframe)?.label ??
              timeframe}
            …
          </p>
        ) : null}
      </div>

      {/* Dashboard content — server-rendered children */}
      {children}
    </div>
  );
}