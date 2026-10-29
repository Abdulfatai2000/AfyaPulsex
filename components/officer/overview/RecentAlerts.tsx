import Link from "next/link";
import { Bell, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getRecentAlerts,
  type AlertSummary,
} from "@/lib/services/officer/dashboard";
import {
  resolveOfficerData,
  type OfficerDataMode,
} from "@/lib/services/officer/data-mode";
import { getRecentAlertsLive } from "@/lib/services/officer/live-adapters";
import { DataErrorPanel } from "@/components/officer/data-mode/DataErrorPanel";

const URGENCY_STYLES: Record<
  AlertSummary["urgency"],
  { dot: string; label: string }
> = {
  urgent: { dot: "bg-[#C63C3C]", label: "Urgent" },
  warning: { dot: "bg-[#D99000]", label: "Warning" },
  info: { dot: "bg-[#20BFD0]", label: "Info" },
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RecentAlerts({ mode }: { mode: OfficerDataMode }) {
  // Privacy-safe officer-facing alert summaries only (aggregate signals),
  // never individual citizen records.
  let alerts: AlertSummary[];
  try {
    alerts = await resolveOfficerData(mode, {
      demo: () => getRecentAlerts(),
      live: () => getRecentAlertsLive(),
    });
  } catch (err) {
    return (
      <DataErrorPanel
        title="Unable to load recent alerts"
        message={err instanceof Error ? err.message : undefined}
      />
    );
  }

  return (
    <Card className="h-full border border-gray-100 shadow-sm rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#1267E8]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-deep-navy">Recent Alerts</h2>
        </div>
        <Link
          href="/officer/notifications"
          className="flex items-center gap-1 rounded text-xs font-medium text-[#1267E8] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#1267E8]"
          aria-label="View all alerts"
        >
          View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {alerts.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">
            No recent alerts for your jurisdiction.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100" aria-label="Recent alerts">
            {alerts.slice(0, 4).map((alert) => {
              const urgency = URGENCY_STYLES[alert.urgency] ?? URGENCY_STYLES.info;
              return (
                <li key={alert.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${urgency.dot}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          href={alert.href}
                          className="truncate text-sm font-medium text-deep-navy outline-none hover:text-[#1267E8] focus-visible:ring-2 focus-visible:ring-[#1267E8] rounded"
                        >
                          {alert.title}
                        </Link>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {urgency.label}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                        {alert.description}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {formatTimestamp(alert.timestamp)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}