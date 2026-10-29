import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Activity, ClipboardList, Radar, TrendingUp } from "lucide-react";
import { cn } from "@/server/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { WarningSummaryCounts } from "@/lib/services/officer/warnings";

interface CardConfig {
  key: keyof WarningSummaryCounts;
  label: string;
  href: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

// Summary cards link into the pre-filtered warning list, matching the hrefs
// already used by the officer Overview metric cards.
const CARDS: readonly CardConfig[] = [
  {
    key: "active",
    label: "Active Warnings",
    href: "/officer/warnings",
    icon: Activity,
    iconBg: "bg-primary-blue/10",
    iconColor: "text-primary-blue",
  },
  {
    key: "requiresReview",
    label: "Requires Review",
    href: "/officer/warnings?status=requires-review",
    icon: ClipboardList,
    iconBg: "bg-warning-amber/10",
    iconColor: "text-warning-amber",
  },
  {
    key: "monitoring",
    label: "Monitoring",
    href: "/officer/warnings?status=monitoring",
    icon: Radar,
    iconBg: "bg-teal/10",
    iconColor: "text-teal",
  },
  {
    key: "escalated",
    label: "Escalated",
    href: "/officer/warnings?status=escalated",
    icon: TrendingUp,
    iconBg: "bg-danger-red/10",
    iconColor: "text-danger-red",
  },
];

export function WarningSummary({ counts }: { counts?: WarningSummaryCounts }) {
  // No counts provided (e.g. the existing warning detail route renders this
  // component without props) — keep a neutral summary placeholder there.
  if (!counts) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-white p-6">
        <h2 className="text-sm font-semibold text-deep-navy">Warning Summary</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Summary counts will be available once a warning view is open.
        </p>
      </section>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map(({ key, label, href, icon: Icon, iconBg, iconColor }) => (
        <Link
          key={key}
          href={href}
          className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/60"
          aria-label={`${label}: ${counts[key]}`}
        >
          <Card className="h-full rounded-xl border border-border shadow-sm transition-shadow duration-200 hover:shadow-md">
            <CardContent className="p-4">
              <span
                className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconBg)}
              >
                <Icon className={cn("h-4 w-4", iconColor)} aria-hidden="true" />
              </span>
              <p className="mt-3 text-2xl font-bold leading-none text-deep-navy">
                {counts[key]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}