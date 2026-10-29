"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarClock, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SessionExpiredState } from "@/components/feedback/SessionExpiredState";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  PublicAlertDataStatus,
  PublicAlertRecord,
} from "@/lib/services/officer/public-alerts";
import { formatPublicAlertDate } from "@/lib/services/officer/public-alerts";
import {
  PublicAlertStatusBadge,
  PublicAlertUrgencySignal,
} from "./PublicAlertStatus";

export function formatAlertArea(alert: PublicAlertRecord): string {
  return alert.lgaName
    ? `${alert.lgaName} LGA`
    : alert.stateName;
}

function PublicAlertTableSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-white"
      aria-busy="true"
      aria-label="Loading public alerts"
    >
      <div className="hidden gap-3 border-b border-gray-100 px-4 py-3 sm:flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-3 w-24" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-3 border-b p-4 last:border-0 sm:flex-row sm:items-center"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function ListState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-6 py-12 text-center">
      {icon}
      <p className="text-sm font-semibold text-deep-navy">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

function AlertsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <ListState
      icon={<RefreshCw className="h-5 w-5 text-danger-red" aria-hidden="true" />}
      title="Unable to load public alerts"
      description={message}
      action={
        <Button variant="outline" size="sm" onClick={onRetry} type="button">
          Retry
        </Button>
      }
    />
  );
}

function AlertsUnauthorizedState({ onReset }: { onReset: () => void }) {
  return (
    <ListState
      icon={<X className="h-5 w-5 text-danger-red" aria-hidden="true" />}
      title="Jurisdiction access restricted"
      description="You are not authorized to view public alerts for the selected jurisdiction. Backend authorization remains authoritative for your access."
      action={
        <Button variant="outline" size="sm" onClick={onReset} type="button">
          Return to authorized area
        </Button>
      }
    />
  );
}

function AlertsEmptyState({ tabLabel }: { tabLabel: string }) {
  return (
    <EmptyState
      className="w-full"
      title={`No ${tabLabel.toLowerCase()} alerts`}
      description={`No public alerts match the ${tabLabel.toLowerCase()} status. Choose another status or create a new alert.`}
    />
  );
}

function ViewAlertButton({ id }: { id: string }) {
  return (
    <Link
      href={`/officer/public-alerts/${id}`}
      className="inline-flex h-7 w-fit items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      View
      <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">alert {id}</span>
    </Link>
  );
}

function PublishedToCell({ alert }: { alert: PublicAlertRecord }) {
  if (!alert.publishedAt) {
    return (
      <span className="text-gray-400" aria-label="Not published">
        —
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <time dateTime={alert.publishedAt}>
        {formatPublicAlertDate(alert.publishedAt)}
      </time>
    </span>
  );
}

interface Props {
  alerts: PublicAlertRecord[];
  status: PublicAlertDataStatus;
  /** Label of the active tab, used by the empty state. */
  tabLabel: string;
  error: string | null;
  onRetry: () => void;
  /** Return to the default status tab (used by the unauthorized action). */
  onReset: () => void;
}

export function PublicAlertTable({
  alerts,
  status,
  tabLabel,
  error,
  onRetry,
  onReset,
}: Props) {
  if (status === "loading") {
    return <PublicAlertTableSkeleton />;
  }

  if (status === "session-expired") {
    return <SessionExpiredState title="Your session has expired" />;
  }

  if (status === "unauthorized") {
    return <AlertsUnauthorizedState onReset={onReset} />;
  }

  if (status === "error") {
    return (
      <AlertsErrorState
        message={error ?? "Something went wrong. Please try again."}
        onRetry={onRetry}
      />
    );
  }

  if (status === "empty") {
    return <AlertsEmptyState tabLabel={tabLabel} />;
  }

  const countLabel = alerts.length === 1 ? "alert" : "alerts";

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        Showing {alerts.length} {countLabel}
      </p>

      {/* Desktop table */}
      <div className="hidden min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm lg:block">
        <Table aria-label="Public health alerts">
          <TableCaption className="sr-only">
            Public health alerts by title, area, publishing status, published
            date, and available actions. Aggregate, public-health information
            only.
          </TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Title
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Area
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Published To
              </TableHead>
              <TableHead className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow
                key={alert.id}
                className="align-top transition-colors hover:bg-gray-50/70"
              >
                <TableCell className="whitespace-normal py-3 pl-4">
                  <Link
                    href={`/officer/public-alerts/${alert.id}`}
                    className="rounded text-sm font-medium text-primary-blue underline-offset-2 transition-colors hover:text-primary-blue/80 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue"
                  >
                    {alert.title}
                  </Link>
                  <span className="mt-1.5 block">
                    <PublicAlertUrgencySignal level={alert.level} />
                  </span>
                </TableCell>
                <TableCell className="whitespace-normal py-3 pr-3 text-xs text-muted-foreground">
                  {formatAlertArea(alert)}
                  <span className="text-gray-400"> · {alert.stateName}</span>
                </TableCell>
                <TableCell className="py-3">
                  <PublicAlertStatusBadge status={alert.status} />
                </TableCell>
                <TableCell className="whitespace-normal py-3 pr-3">
                  <PublishedToCell alert={alert} />
                </TableCell>
                <TableCell className="py-3 pr-4">
                  <ViewAlertButton id={alert.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 text-[11px] text-muted-foreground"
          role="note"
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" />
          <span>
            Public alerts show public-health messaging and operational metadata
            only — never individual records.
          </span>
        </div>
      </div>

      {/* Mobile cards */}
      <ul
        className="flex min-w-0 flex-col gap-3 lg:hidden"
        aria-label={`Public alerts list · ${countLabel}`}
      >
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="min-w-0 rounded-xl border border-border bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/officer/public-alerts/${alert.id}`}
                className="min-w-0 rounded text-sm font-semibold text-primary-blue underline-offset-2 transition-colors hover:text-primary-blue/80 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue"
              >
                {alert.title}
              </Link>
              <PublicAlertStatusBadge status={alert.status} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <PublicAlertUrgencySignal level={alert.level} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatAlertArea(alert)} · {alert.stateName}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-2.5 text-xs">
              <span className="text-gray-600">
                <span className="font-medium text-deep-navy">Published:</span>{" "}
                {alert.publishedAt ? (
                  <time dateTime={alert.publishedAt}>
                    {formatPublicAlertDate(alert.publishedAt)}
                  </time>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </span>
              <span className="ml-auto">
                <ViewAlertButton id={alert.id} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}