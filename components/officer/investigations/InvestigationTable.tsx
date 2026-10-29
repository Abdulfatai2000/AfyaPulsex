"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { RefreshCw, ShieldCheck, X } from "lucide-react";
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
  Investigation,
  InvestigationDataStatus,
} from "@/lib/services/officer/investigations";
import { formatUpdatedAt } from "@/components/officer/warnings/WarningCard";
import { InvestigationStatusBadge } from "./InvestigationStatusBadge";

function InvestigationTableSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-white"
      aria-busy="true"
      aria-label="Loading investigations"
    >
      <div className="hidden gap-3 border-b border-gray-100 px-4 py-3 sm:flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-3 w-24" />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col gap-3 border-b p-4 last:border-0 sm:flex-row sm:items-center">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
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

function InvestigationErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <ListState
      icon={<RefreshCw className="h-5 w-5 text-danger-red" aria-hidden="true" />}
      title="Unable to load investigations"
      description={message}
      action={
        <Button variant="outline" size="sm" onClick={onRetry} type="button">
          Retry
        </Button>
      }
    />
  );
}

function InvestigationUnauthorizedState({ onReset }: { onReset: () => void }) {
  return (
    <ListState
      icon={<X className="h-5 w-5 text-danger-red" aria-hidden="true" />}
      title="Jurisdiction access restricted"
      description="You are not authorized to view investigations for the selected jurisdiction. Backend authorization remains authoritative for your access."
      action={
        <Button variant="outline" size="sm" onClick={onReset} type="button">
          Return to authorized area
        </Button>
      }
    />
  );
}

function InvestigationEmptyState({ onShowAll }: { onShowAll: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <EmptyState
        className="w-full"
        title="No investigations in this status"
        description="No open investigations match the selected status. Choose another status or show all investigations."
      />
      <Button variant="outline" size="sm" onClick={onShowAll} type="button">
        Show all investigations
      </Button>
    </div>
  );
}

interface Props {
  investigations: Investigation[];
  status: InvestigationDataStatus;
  error: string | null;
  onRetry: () => void;
  /** Return to the "all" tab (used by empty/unauthorized actions). */
  onShowAll: () => void;
}

export function InvestigationTable({
  investigations,
  status,
  error,
  onRetry,
  onShowAll,
}: Props) {
  if (status === "loading") {
    return <InvestigationTableSkeleton />;
  }

  // Driven by the server-side session boundary (DEV4); the mock adapter never
  // signals auth outcomes on its own.
  if (status === "session-expired") {
    return <SessionExpiredState title="Your session has expired" />;
  }

  if (status === "unauthorized") {
    return <InvestigationUnauthorizedState onReset={onShowAll} />;
  }

  if (status === "error") {
    return (
      <InvestigationErrorState
        message={error ?? "Something went wrong. Please try again."}
        onRetry={onRetry}
      />
    );
  }

  if (status === "empty") {
    return <InvestigationEmptyState onShowAll={onShowAll} />;
  }

  const countLabel =
    investigations.length === 1 ? "investigation" : "investigations";

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          role="status"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          Showing {investigations.length} {countLabel}
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm lg:block">
        <Table aria-label="Investigations">
          <TableCaption className="sr-only">
            Operational investigations by signal, location, status, assigned
            officer, and last-updated time. Aggregate, authorized information
            only.
          </TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Signal
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Location
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned To
              </TableHead>
              <TableHead className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investigations.map((investigation) => (
              <TableRow
                key={investigation.id}
                className="align-top transition-colors hover:bg-gray-50/70"
              >
                <TableCell className="whitespace-normal py-3 pl-4">
                  <Link
                    href={`/officer/investigations/${investigation.id}`}
                    className="rounded text-sm font-medium text-primary-blue underline-offset-2 transition-colors hover:text-primary-blue/80 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue"
                  >
                    {investigation.signal}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-normal py-3 pr-3 text-xs text-muted-foreground">
                  {investigation.lgaName} LGA
                  <span className="text-gray-400"> · {investigation.stateName}</span>
                </TableCell>
                <TableCell className="py-3">
                  <InvestigationStatusBadge status={investigation.status} />
                </TableCell>
                <TableCell className="whitespace-normal py-3 pr-3 text-xs text-gray-600">
                  {investigation.assignedTo}
                </TableCell>
                <TableCell className="whitespace-normal py-3 pr-4 text-xs text-muted-foreground">
                  <time dateTime={investigation.lastUpdated}>
                    {formatUpdatedAt(investigation.lastUpdated)}
                  </time>
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
            Investigations show aggregate signal guidance and authorized
            operational details only — never individual records.
          </span>
        </div>
      </div>

      {/* Mobile cards */}
      <ul
        className="flex min-w-0 flex-col gap-3 lg:hidden"
        aria-label={`Investigations list · ${countLabel}`}
      >
        {investigations.map((investigation) => (
          <li
            key={investigation.id}
            className="min-w-0 rounded-xl border border-border bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/officer/investigations/${investigation.id}`}
                className="min-w-0 rounded text-sm font-semibold text-primary-blue underline-offset-2 transition-colors hover:text-primary-blue/80 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue"
              >
                {investigation.signal}
              </Link>
              <InvestigationStatusBadge status={investigation.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {investigation.lgaName} LGA · {investigation.stateName}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-2.5 text-xs">
              <span className="text-gray-600">
                <span className="font-medium text-deep-navy">Assigned:</span>{" "}
                {investigation.assignedTo}
              </span>
              <span className="text-muted-foreground">
                <span className="font-medium text-deep-navy">Updated:</span>{" "}
                <time dateTime={investigation.lastUpdated}>
                  {formatUpdatedAt(investigation.lastUpdated)}
                </time>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}