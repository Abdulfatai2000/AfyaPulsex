"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EarlyWarning, WarningDataStatus } from "@/lib/services/officer/warnings";
import { WarningActions } from "./WarningActions";
import { WarningCard, formatUpdatedAt } from "./WarningCard";
import {
  WarningSeverityBadge,
  WarningStatusBadge,
} from "./WarningStatusBadge";

function WarningSignalCell({ warning }: { warning: EarlyWarning }) {
  return (
    <div className="min-w-0 max-w-[260px]">
      <Link
        href={`/officer/warnings/${warning.id}`}
        className="inline-flex items-start gap-1 rounded font-medium text-deep-navy outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary-blue/60"
      >
        {warning.title}
      </Link>
      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {warning.signal}
      </p>
      {warning.dataSufficiency === "insufficient" && (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-warning-amber">
          <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
          Insufficient aggregated data
        </p>
      )}
    </div>
  );
}

function WarningListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading warnings">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-white p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-3/4" />
          <div className="mt-3 flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
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

function WarningErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <ListState
      icon={<RefreshCw className="h-5 w-5 text-danger-red" aria-hidden="true" />}
      title="Unable to load warnings"
      description={message}
      action={
        <Button variant="outline" size="sm" onClick={onRetry} type="button">
          Retry
        </Button>
      }
    />
  );
}

function WarningInsufficientState({ onReset }: { onReset: () => void }) {
  return (
    <ListState
      icon={<ShieldAlert className="h-5 w-5 text-warning-amber" aria-hidden="true" />}
      title="Insufficient aggregated data"
      description="The current filters produced warning areas below the privacy aggregation threshold. Broaden your filters to reveal aggregate warning signals."
      action={
        <Button variant="outline" size="sm" onClick={onReset} type="button">
          Reset filters
        </Button>
      }
    />
  );
}

function WarningEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <EmptyState
        className="w-full"
        title="No warnings match your filters"
        description="Try adjusting the status, location, health condition, or time period."
      />
      <Button variant="outline" size="sm" onClick={onReset} type="button">
        Reset filters
      </Button>
    </div>
  );
}

function WarningDesktopTable({ warnings }: { warnings: EarlyWarning[] }) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
      <Table aria-label="Early warnings">
        <TableCaption className="sr-only">
          Aggregate warnings by status, location, time window, severity, and last updated.
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-3 pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Warning / Signal
            </TableHead>
            <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Location
            </TableHead>
            <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Time Window
            </TableHead>
            <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Severity
            </TableHead>
            <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last Updated
            </TableHead>
            <TableHead className="py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warnings.map((warning) => (
            <TableRow key={warning.id} className="align-top">
              <TableCell className="whitespace-normal py-3 pl-4">
                <WarningSignalCell warning={warning} />
              </TableCell>
              <TableCell className="whitespace-normal py-3 pr-3 text-xs text-muted-foreground">
                {[warning.state, warning.lga, warning.ward].filter(Boolean).join(" · ")}
              </TableCell>
              <TableCell className="whitespace-normal py-3 text-xs text-muted-foreground">
                {warning.timeWindow}
              </TableCell>
              <TableCell className="py-3">
                <WarningStatusBadge status={warning.status} />
              </TableCell>
              <TableCell className="py-3">
                <WarningSeverityBadge severity={warning.severity} />
              </TableCell>
              <TableCell className="whitespace-normal py-3 text-xs text-muted-foreground">
                <time dateTime={warning.lastUpdated}>
                  {formatUpdatedAt(warning.lastUpdated)}
                </time>
              </TableCell>
              <TableCell className="py-3 pr-4 text-right">
                <div className="flex justify-end">
                  <WarningActions warning={warning} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface WarningListProps {
  warnings: EarlyWarning[];
  status: WarningDataStatus;
  error: string | null;
  onRetry: () => void;
  onReset: () => void;
}

export function WarningList({
  warnings,
  status,
  error,
  onRetry,
  onReset,
}: WarningListProps) {
  if (status === "loading") {
    return <WarningListSkeleton />;
  }

  if (status === "error") {
    return <WarningErrorState message={error ?? "Something went wrong. Please try again."} onRetry={onRetry} />;
  }

  if (status === "insufficient") {
    return <WarningInsufficientState onReset={onReset} />;
  }

  if (status === "empty") {
    return <WarningEmptyState onReset={onReset} />;
  }

  const countLabel = warnings.length === 1 ? "warning" : "warnings";

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        Showing {warnings.length} {countLabel}
      </p>

      <div className="hidden lg:block">
        <WarningDesktopTable warnings={warnings} />
      </div>

      <ul className="flex min-w-0 flex-col gap-3 lg:hidden" aria-label="Early warnings list">
        {warnings.map((warning) => (
          <li key={warning.id} className="min-w-0">
            <WarningCard warning={warning} />
          </li>
        ))}
      </ul>
    </div>
  );
}