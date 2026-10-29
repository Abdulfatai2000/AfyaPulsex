import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, ClipboardList, FilePlus, Users, TrendingUp, TrendingDown } from "lucide-react";
import {
  getDashboardMetrics,
  type Timeframe,
  type DashboardMetricValue,
  type DashboardMetrics,
} from "@/lib/services/officer/dashboard";
import {
  resolveOfficerData,
  type OfficerDataMode,
} from "@/lib/services/officer/data-mode";
import { getDashboardMetricsLive } from "@/lib/services/officer/live-adapters";
import { DataErrorPanel } from "@/components/officer/data-mode/DataErrorPanel";

interface Props {
  timeframe: Timeframe;
  mode: OfficerDataMode;
}

function formatChange(value: DashboardMetricValue) {
  if (value === null) {
    return "not available";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

const METRIC_CONFIG = [
  {
    key: "activeSignals" as const,
    changeKey: "activeSignalsChange" as const,
    label: "Active Signals",
    icon: Activity,
    iconBg: "bg-blue-50",
    iconColor: "text-[#1267E8]",
    href: "/officer/warnings",
    downIsGood: true,
  },
  {
    key: "requiresReview" as const,
    changeKey: "requiresReviewChange" as const,
    label: "Requires Review",
    icon: ClipboardList,
    iconBg: "bg-amber-50",
    iconColor: "text-[#D99000]",
    href: "/officer/warnings?status=requires-review",
    downIsGood: true,
  },
  {
    key: "newReports" as const,
    changeKey: "newReportsChange" as const,
    label: "New Reports",
    icon: FilePlus,
    iconBg: "bg-cyan-50",
    iconColor: "text-[#20BFD0]",
    href: "/officer/explorer",
    downIsGood: false,
  },
  {
    key: "peopleReached" as const,
    changeKey: "peopleReachedChange" as const,
    label: "People Reached",
    icon: Users,
    iconBg: "bg-green-50",
    iconColor: "text-[#22A06B]",
    href: "/officer/analytics",
    downIsGood: false,
    approximate: true,
  },
];

export default async function OfficerMetricCards({ timeframe, mode }: Props) {
  let metrics: DashboardMetrics;
  try {
    metrics = await resolveOfficerData(mode, {
      demo: () => getDashboardMetrics(timeframe),
      live: () => getDashboardMetricsLive(timeframe),
    });
  } catch (err) {
    return (
      <DataErrorPanel
        title="Unable to load dashboard metrics"
        message={err instanceof Error ? err.message : undefined}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {METRIC_CONFIG.map(({ key, changeKey, label, icon: Icon, iconBg, iconColor, href, downIsGood, approximate }) => {
        const value = metrics[key];
        const change = metrics[changeKey];
        const isSuppressed = value === null;
        const isPositiveChange = change !== null && change > 0;
        const isGoodTrend = isPositiveChange ? (downIsGood ? !isPositiveChange : isPositiveChange) : downIsGood;
        const TrendIcon = isPositiveChange ? TrendingUp : TrendingDown;
        const trendColor =
          change === null || change === 0
            ? "text-gray-400"
            : isGoodTrend
              ? "text-[#22A06B]"
              : "text-[#C63C3C]";

        return (
          <Link
            key={key}
            href={href}
            className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1267E8] rounded-xl"
            aria-label={
              isSuppressed
                ? `${label}: Insufficient aggregated data`
                : `${label}: ${value.toLocaleString()}${approximate ? " (approximate)" : ""}. Change: ${formatChange(change)}`
            }
          >
            <Card className="border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-shadow duration-200 h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${iconBg}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
                  </div>
                  {!isSuppressed && change !== null && change !== 0 && (
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`} aria-hidden="true">
                      <TrendIcon className="w-3 h-3" />
                      <span>{formatChange(change)}</span>
                    </div>
                  )}
                </div>
                {isSuppressed ? (
                  <p className="text-[11px] font-semibold leading-snug text-[#D99000]">
                    Insufficient aggregated data
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-[#08214A] leading-none">
                    {value.toLocaleString()}
                    {approximate && value > 0 && (
                      <span className="text-xs font-normal text-gray-400 ml-1">~</span>
                    )}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}