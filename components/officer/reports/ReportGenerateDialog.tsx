"use client";

import { Download, FileCheck2 } from "lucide-react";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ReportGenerationResult } from "@/lib/services/officer/reports";

interface Props {
  result: ReportGenerationResult;
  onExport: () => void;
  onClose: () => void;
}

/**
 * The generated aggregate report — summary indicators plus a real CSV export.
 * Only aggregate public-health information is ever shown here.
 */
export function ReportGenerateDialog({ result, onExport, onClose }: Props) {
  const generatedTime = new Date(result.generatedAt).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 shrink-0 text-success-green" aria-hidden="true" />
          {result.reportTitle}
        </DialogTitle>
        <DialogDescription>
          Report generated for {result.jurisdictionLabel} on {generatedTime}.
          Summary indicators below are aggregate only.
        </DialogDescription>
      </DialogHeader>

      <dl className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
        {result.summaryRows.map((row) => (
          <div
            key={row.label}
            className="flex min-w-0 items-baseline justify-between gap-4"
          >
            <dt className="min-w-0 text-xs text-muted-foreground">{row.label}</dt>
            <dd className="shrink-0 text-sm font-semibold text-deep-navy">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} type="button">
          Done
        </Button>
        <Button onClick={onExport} type="button">
          <Download aria-hidden="true" />
          Export CSV
        </Button>
      </DialogFooter>
    </>
  );
}