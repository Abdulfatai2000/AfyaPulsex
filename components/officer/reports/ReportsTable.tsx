"use client";

import type { ReactNode } from "react";
import { FileDown, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
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
  ReportsDataStatus,
  StandardReportDefinition,
  StandardReportId,
} from "@/lib/services/officer/reports";

function ReportsTableSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-white"
      aria-busy="true"
      aria-label="Loading standard reports"
    >
      <div className="hidden gap-3 border-b border-gray-100 px-4 py-3 sm:flex">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-3 w-28" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-3 border-b p-4 last:border-0 sm:flex-row sm:items-center"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function TableState({
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

function ReportsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <TableState
      icon={<RefreshCw className="h-5 w-5 text-danger-red" aria-hidden="true" />}
      title="Unable to load reports"
      description={message}
      action={
        <Button variant="outline" size="sm" onClick={onRetry} type="button">
          Retry
        </Button>
      }
    />
  );
}

function ReportsUnauthorizedState({ onReset }: { onReset: () => void }) {
  return (
    <TableState
      icon={<X className="h-5 w-5 text-danger-red" aria-hidden="true" />}
      title="Jurisdiction access restricted"
      description="You are not authorized to view reports for the selected jurisdiction. Backend authorization remains authoritative for your access."
      action={
        <Button variant="outline" size="sm" onClick={onReset} type="button">
          Return to authorized area
        </Button>
      }
    />
  );
}

function ReportsEmptyState() {
  return (
    <EmptyState
      className="w-full"
      title="No standard reports available"
      description="The reporting catalog is empty. Check back shortly or try again."
    />
  );
}

function GenerateButton({
  reportId,
  busy,
  busyFor,
  onGenerate,
}: {
  reportId: StandardReportId;
  busy: boolean;
  busyFor: StandardReportId | null;
  onGenerate: (reportId: StandardReportId) => void;
}) {
  const generatingThisReport = busy && busyFor === reportId;
  return (
    <Button
      size="sm"
      onClick={() => onGenerate(reportId)}
      disabled={busy}
      type="button"
      aria-busy={generatingThisReport}
    >
      {generatingThisReport ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <FileDown className="size-3.5" aria-hidden="true" />
      )}
      {generatingThisReport ? "Generating…" : "Generate"}
    </Button>
  );
}

interface Props {
  definitions: StandardReportDefinition[];
  status: ReportsDataStatus;
  /** Id of the report currently generating (blocks the other buttons). */
  busyFor: StandardReportId | null;
  error: string | null;
  onGenerate: (reportId: StandardReportId) => void;
  onRetry: () => void;
  onReset: () => void;
}

export function ReportsTable({
  definitions,
  status,
  busyFor,
  error,
  onGenerate,
  onRetry,
  onReset,
}: Props) {
  if (status === "loading") {
    return <ReportsTableSkeleton />;
  }

  if (status === "session-expired") {
    return <SessionExpiredState title="Your session has expired" />;
  }

  if (status === "unauthorized") {
    return <ReportsUnauthorizedState onReset={onReset} />;
  }

  if (status === "error") {
    return (
      <ReportsErrorState
        message={
          error ?? "The standard reports could not be loaded. Please try again."
        }
        onRetry={onRetry}
      />
    );
  }

  if (status === "empty") {
    return <ReportsEmptyState />;
  }

  const busy = busyFor !== null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p
        role="status"
        aria-live="polite"
        className="text-xs text-muted-foreground"
      >
        {definitions.length} standard report{definitions.length === 1 ? "" : "s"}
      </p>

      {/* Desktop table */}
      <div className="hidden min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm lg:block">
        <Table aria-label="Standard reports">
          <TableCaption className="sr-only">
            Standard reports with report type, description, and a Generate
            action. Aggregate reporting data only.
          </TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Report Type
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </TableHead>
              <TableHead className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {definitions.map((report) => (
              <TableRow
                key={report.id}
                className="align-middle transition-colors hover:bg-gray-50/70"
              >
                <TableCell className="py-3 pl-4">
                  <span className="text-sm font-medium text-deep-navy">
                    {report.title}
                  </span>
                </TableCell>
                <TableCell className="whitespace-normal py-3 pr-3 text-xs text-muted-foreground">
                  {report.description}
                </TableCell>
                <TableCell className="py-3 pr-4">
                  <GenerateButton
                    reportId={report.id}
                    busy={busy}
                    busyFor={busyFor}
                    onGenerate={onGenerate}
                  />
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
            Reports contain aggregate public-health indicators only — never
            individual records.
          </span>
        </div>
      </div>

      {/* Mobile cards */}
      <ul
        className="flex min-w-0 flex-col gap-3 lg:hidden"
        aria-label="Standard reports list"
      >
        {definitions.map((report) => (
          <li
            key={report.id}
            className="min-w-0 rounded-xl border border-border bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-deep-navy">
                {report.title}
              </p>
              <GenerateButton
                reportId={report.id}
                busy={busy}
                busyFor={busyFor}
                onGenerate={onGenerate}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}