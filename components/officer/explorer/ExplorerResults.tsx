"use client";

import type { ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Eye,
  RefreshCw,
  Sparkles,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/server/lib/utils";
import { Button } from "@/components/ui/button";
import { ExplorerPrivacyState } from "./ExplorerPrivacyState";
import type {
  ExplorerActivityStatus,
  ExplorerData,
  ExplorerDataStatus,
  ExplorerSignalGroup,
} from "@/lib/services/officer/explorer";
import {
  ACTIVITY_LABELS,
  SEVERITY_LABELS,
} from "@/lib/services/officer/explorer";

const ACTIVITY_TONE: Record<
  ExplorerActivityStatus,
  { tone: string; Icon: LucideIcon }
> = {
  elevated: { tone: "bg-danger-red/10 text-danger-red", Icon: TrendingUp },
  "pattern-noticed": { tone: "bg-warning-amber/10 text-warning-amber", Icon: Sparkles },
  "requires-review": { tone: "bg-primary-blue/10 text-primary-blue", Icon: Eye },
  monitoring: { tone: "bg-teal/10 text-teal", Icon: Activity },
  "returned-to-baseline": {
    tone: "bg-success-green/10 text-success-green",
    Icon: CheckCircle2,
  },
};

function ActivityBadge({ status }: { status: ExplorerActivityStatus }) {
  const { tone, Icon } = ACTIVITY_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {ACTIVITY_LABELS[status]}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: ExplorerSignalGroup["severity"] }) {
  const dot =
    severity === "high"
      ? "bg-danger-red"
      : severity === "moderate"
        ? "bg-warning-amber"
        : "bg-teal";
  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1.5 text-xs font-medium text-deep-navy">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} aria-hidden="true" />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

function SignalsCell({ group }: { group: ExplorerSignalGroup }) {
  if (group.dataSufficiency === "insufficient") {
    return (
      <span
        className="text-xs font-medium text-warning-amber"
        title={group.note}
      >
        Insufficient
      </span>
    );
  }
  return (
    <span className="text-sm font-semibold text-deep-navy">
      {(group.signalCount ?? 0).toLocaleString()}
    </span>
  );
}

function ReportSplit({ group }: { group: ExplorerSignalGroup }) {
  if (!group.reportTypes) {
    return null;
  }
  const { case: c, outbreak, surveillance } = group.reportTypes;
  return (
    <span className="text-xs text-gray-500">
      Case {c} / Outbreak {outbreak} / Surveillance {surveillance}
    </span>
  );
}

function GroupNameCell({ group }: { group: ExplorerSignalGroup }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-deep-navy">{group.name}</p>
      <p className="text-xs text-muted-foreground">{group.area}</p>
      {group.dataSufficiency === "insufficient" && (
        <p className="mt-0.5 text-[10px] text-warning-amber" title={group.note}>
          Suppressed below privacy threshold
        </p>
      )}
    </div>
  );
}

function StatePanel({
  icon,
  tone,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-white p-6 text-center">
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", tone)}>
        {icon}
      </span>
      <p className="text-sm font-semibold text-deep-navy">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

interface Props {
  status: ExplorerDataStatus;
  data: ExplorerData | null;
  error: string | null;
  onReset: () => void;
  onRetry: () => void;
}

export function ExplorerResults({ status, data, error, onReset, onRetry }: Props) {
  if (status === "loading") {
    return (
      <div
        className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4"
        aria-label="Loading signal groups"
        aria-busy="true"
      >
        <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <StatePanel
        icon={<X className="h-5 w-5 text-danger-red" />}
        tone="bg-danger-red/10"
        title="Jurisdiction access restricted"
        description={
          error ??
          "You are not authorized to view data for the selected jurisdiction."
        }
        action={
          <Button size="sm" variant="outline" onClick={onReset} type="button" className="text-xs">
            Return to authorized area
          </Button>
        }
      />
    );
  }

  if (status === "error") {
    return (
      <StatePanel
        icon={<RefreshCw className="h-5 w-5 text-danger-red" />}
        tone="bg-danger-red/10"
        title="Unable to load signal data"
        description={
          error ??
          "A network or backend error occurred. Please try again."
        }
        action={
          <Button size="sm" variant="outline" onClick={onRetry} type="button" className="text-xs">
            Retry
          </Button>
        }
      />
    );
  }

  if (status === "empty") {
    return (
      <StatePanel
        icon={<X className="h-5 w-5 text-gray-400" />}
        tone="bg-gray-100"
        title="No signals match your filters"
        description="Try adjusting the symptom, condition, severity, or time range. No aggregate signal groups were found for the current selection."
        action={
          <Button size="sm" variant="outline" onClick={onReset} type="button" className="text-xs">
            Reset filters
          </Button>
        }
      />
    );
  }

  if (status === "insufficient") {
    return <ExplorerPrivacyState onReset={onReset} />;
  }

  if (!data) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-border bg-white p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No signal data available for the current selection.
        </p>
      </div>
    );
  }

  const groups = data.groups;

  return (
    <div className="min-w-0 rounded-xl border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-deep-navy">Signal groups</h3>
        <p className="text-xs text-muted-foreground">{data.scope.areaLabel}</p>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table
          className="w-full min-w-max text-left text-sm"
          aria-label="Aggregate signal groups"
        >
          <thead>
            <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
              <th scope="col" className="px-4 py-2 font-medium">
                Signal group
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Activity
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Severity
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Signals
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Report split
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Primary symptom
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr
                key={group.groupId}
                className="border-b border-gray-50 align-top last:border-0"
              >
                <td className="px-4 py-3">
                  <GroupNameCell group={group} />
                </td>
                <td className="px-4 py-3">
                  <ActivityBadge status={group.activityStatus} />
                </td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={group.severity} />
                </td>
                <td className="px-4 py-3">
                  <SignalsCell group={group} />
                </td>
                <td className="px-4 py-3">
                  <ReportSplit group={group} />
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-600">
                    {group.primarySymptom ?? "-"}
                  </p>
                  {group.healthCondition && (
                    <p className="text-[10px] text-gray-400">
                      {group.healthCondition}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col gap-3 p-3 sm:hidden">
        {groups.map((group) => (
          <li
            key={group.groupId}
            className="rounded-xl border border-gray-200 bg-off-white p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-deep-navy">
                  {group.name}
                </p>
                <p className="text-xs text-muted-foreground">{group.area}</p>
              </div>
              <ActivityBadge status={group.activityStatus} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <SeverityBadge severity={group.severity} />
              <SignalsCell group={group} />
              {group.primarySymptom && (
                <span className="text-gray-600">{group.primarySymptom}</span>
              )}
            </div>
            <div className="mt-1.5">
              <ReportSplit group={group} />
            </div>
            {group.dataSufficiency === "insufficient" && (
              <p className="mt-1.5 text-[10px] text-warning-amber" title={group.note}>
                Suppressed below privacy threshold - counts hidden.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}