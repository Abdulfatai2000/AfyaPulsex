/**
 * Officer Reports & Export — aggregate report adapter (mock).
 *
 * SECURITY / PRIVACY CONTRACT (DEV4):
 * - This module returns ONLY aggregate reporting data: report catalog entries,
 *   jurisdiction labels, and aggregate summary indicators. It never produces
 *   citizen names, citizen ids, phone numbers, exact addresses, individual
 *   records, or raw submissions.
 * - Jurisdiction is resolved through the shared geography service; an unknown
 *   State throws the same restricted-jurisdiction error used elsewhere.
 * - The browser never talks to MongoDB; the backend/auth layer (DEV4) remains
 *   authoritative for what a report may actually contain.
 *
 * TODO(DEV3): Replace the mock catalog and generation with the real reports
 *   pipeline (server/services/reports currently stubs runReport). The exported
 *   types and signatures below are the frontend contract.
 * TODO(DEV4): Authorize report generation against the officer session and its
 *   jurisdiction at the server boundary.
 */

import { geographyService } from "./geography";

export type ReportsViewTab = "standard" | "custom" | "scheduled";

export type StandardReportId =
  | "daily-summary"
  | "lga-report"
  | "symptom-trends"
  | "investigation-report"
  | "response-report";

export interface StandardReportDefinition {
  id: StandardReportId;
  title: string;
  description: string;
}

export type ReportsDataStatus =
  | "loading"
  | "ready"
  | "empty"
  | "unauthorized"
  | "session-expired"
  | "error";

export class ReportsServiceError extends Error {
  constructor(
    public code: "unauthorized" | "network",
    message?: string,
  ) {
    super(message);
    this.name = "ReportsServiceError";
  }
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const DEFAULT_JURISDICTION = "osun" as const;

export const REPORT_TABS: ReadonlyArray<{
  value: ReportsViewTab;
  label: string;
}> = [
  { value: "standard", label: "Standard Reports" },
  { value: "custom", label: "Custom Report" },
  { value: "scheduled", label: "Scheduled Reports" },
];

/**
 * Catalog of standard reports (report type + description). The rows are
 * authored here — behind the service — never hardcoded in the page component.
 * TODO(DEV3): derive from the real reports pipeline.
 */
const STANDARD_REPORT_CATALOG: StandardReportDefinition[] = [
  {
    id: "daily-summary",
    title: "Daily Summary",
    description: "Overview of key indicators",
  },
  {
    id: "lga-report",
    title: "LGA Report",
    description: "Detailed LGA analysis",
  },
  {
    id: "symptom-trends",
    title: "Symptom Trends",
    description: "Trends and comparisons",
  },
  {
    id: "investigation-report",
    title: "Investigation Report",
    description: "Investigation timeline",
  },
  {
    id: "response-report",
    title: "Response Report",
    description: "Response actions and outcomes",
  },
];

/** Marginally async so the UI exercises its loading path before data arrives. */
export async function getStandardReports(): Promise<StandardReportDefinition[]> {
  await delay(280);
  return STANDARD_REPORT_CATALOG;
}

/**
 * Derive the list/feature status from a loaded reports result (loading/error
 * states are driven by the fetch lifecycle).
 */
export function deriveReportsStatus(
  definitions: StandardReportDefinition[],
): "ready" | "empty" {
  return definitions.length === 0 ? "empty" : "ready";
}

/**
 * The officer's authorized reporting jurisdiction resolved from the shared
 * geography service. Used for the "generated for" context on report output.
 */
export async function getReportJurisdiction(): Promise<{
  stateId: string;
  stateName: string;
}> {
  await delay(200);
  const state = await geographyService.getStateById(DEFAULT_JURISDICTION);
  if (!state) {
    throw new ReportsServiceError(
      "unauthorized",
      "Report access is restricted for the selected jurisdiction.",
    );
  }
  return { stateId: state.id, stateName: state.name };
}

/* ------------------------------------------------------------------ *
 * Standard report generation / export.
 * ------------------------------------------------------------------ */

export interface ReportSummaryRow {
  label: string;
  value: string;
}

export interface ReportGenerationResult {
  id: string;
  reportId: StandardReportId;
  reportTitle: string;
  generatedAt: string;
  jurisdictionLabel: string;
  summaryRows: ReportSummaryRow[];
  csv: string;
}

/**
 * Aggregate indicator rows per standard report — counts and labels only, safe
 * for public-health reporting. TODO(DEV3): replace with real aggregates and
 * add server-side authorization before generation.
 */
function summaryFor(
  reportId: StandardReportId,
  jurisdictionLabel: string,
): ReportSummaryRow[] {
  const window = "Last 24 hours";
  switch (reportId) {
    case "daily-summary":
      return [
        { label: "Jurisdiction", value: jurisdictionLabel },
        { label: "Active early warnings", value: "3" },
        { label: "Published public alerts", value: "3" },
        { label: "Open investigations", value: "4" },
        { label: "Responses in progress", value: "2" },
        { label: "Responses completed", value: "1" },
        { label: "Reporting window", value: window },
      ];
    case "lga-report":
      return [
        { label: "Jurisdiction", value: jurisdictionLabel },
        { label: "LGAs covered", value: "5" },
        { label: "Highest signal area", value: "Ife Central LGA" },
        { label: "Focus indicators", value: "Fever, cough, respiratory" },
        { label: "Reporting window", value: "Sep 1 - Sep 23, 2026" },
      ];
    case "symptom-trends":
      return [
        { label: "Jurisdiction", value: jurisdictionLabel },
        { label: "Monitored symptoms", value: "8" },
        { label: "Above-baseline trend", value: "Fever" },
        { label: "Comparison period", value: "14 days" },
        { label: "Trend direction", value: "Rising / stable" },
        { label: "Reporting window", value: "Sep 10 - Sep 23, 2026" },
      ];
    case "investigation-report":
      return [
        { label: "Jurisdiction", value: jurisdictionLabel },
        { label: "Open investigations", value: "4" },
        { label: "Pending review", value: "1" },
        { label: "Escalated", value: "1" },
        { label: "Closed", value: "12" },
        { label: "Average resolution time", value: "3 days" },
        { label: "Reporting window", value: window },
      ];
    case "response-report":
      return [
        { label: "Jurisdiction", value: jurisdictionLabel },
        { label: "Directed", value: "1" },
        { label: "Reviewing", value: "2" },
        { label: "Monitoring", value: "2" },
        { label: "Escalated", value: "1" },
        { label: "Resolved", value: "1" },
        { label: "Reporting window", value: window },
      ];
    default:
      return [{ label: "Jurisdiction", value: jurisdictionLabel }];
  }
}

/** Aggregate CSV rendering of a generated report (client-side export). */
export function buildReportCsv(result: ReportGenerationResult): string {
  const lines = [
    `Report,"${result.reportTitle}"`,
    `Generated,"${result.generatedAt}"`,
    `Jurisdiction,"${result.jurisdictionLabel}"`,
    "",
    "Indicator,Value",
    ...result.summaryRows.map((row) => `"${row.label}","${row.value}"`),
  ];
  return lines.join("\r\n");
}

/**
 * Generate a standard report as an aggregate, summarized artifact. Simulates
 * pipeline work (loading state) and is fully replaceable by the real
 * (authorized, server-side) generation — the UI never fabricates a file from
 * raw citizen data.
 *
 * TODO(DEV3): replace with real pipeline.
 * TODO(DEV4): authorize generation at the server boundary.
 */
export async function generateStandardReport(
  reportId: StandardReportId,
): Promise<ReportGenerationResult> {
  await delay(1100);
  const jurisdiction = await getReportJurisdiction();
  const definition =
    STANDARD_REPORT_CATALOG.find((item) => item.id === reportId) ??
    STANDARD_REPORT_CATALOG[0];
  const generatedAt = new Date().toISOString();
  const summaryRows = summaryFor(reportId, jurisdiction.stateName);
  const result: ReportGenerationResult = {
    id: `rpt-${Date.now().toString(36)}`,
    reportId: definition.id,
    reportTitle: definition.title,
    generatedAt,
    jurisdictionLabel: jurisdiction.stateName,
    summaryRows,
    csv: "",
  };
  result.csv = buildReportCsv(result);
  return result;
}

/**
 * Trigger the browser download of a generated aggregate report as CSV.
 * Client-only (uses DOM APIs).
 */
export function downloadReportCsv(result: ReportGenerationResult): void {
  const blob = new Blob([result.csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${result.reportId}-${result.generatedAt.slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ *
 * Custom + Scheduled report feature status.
 * ------------------------------------------------------------------ */

export interface ReportsFeatureStatus {
  available: boolean;
  heading: string;
  description: string;
  notes: string[];
}

/**
 * Custom-report builder status. Not yet available (the server only stubs
 * runReport today); the UI renders a professional coming-state rather than
 * inventing unrelated functionality.
 * TODO(DEV3): flip `available` once the real builder ships.
 */
export async function getCustomReportStatus(): Promise<ReportsFeatureStatus> {
  await delay(220);
  return {
    available: false,
    heading: "Custom reports are in development",
    description:
      "Build your own reports by choosing indicators, areas, and a time window. Planned for the next reporting milestone.",
    notes: [
      "Indicator and time-window selection",
      "Area and LGA filtering",
      "Scheduled delivery",
      "CSV export",
    ],
  };
}

/**
 * Scheduled-report status. Not yet available; the UI renders a professional
 * coming-state. TODO(DEV3): flip `available` once scheduling ships.
 */
export async function getScheduledReportsStatus(): Promise<ReportsFeatureStatus> {
  await delay(220);
  return {
    available: false,
    heading: "Scheduled reports are in development",
    description:
      "Receive recurring standard reports on a cadence you choose. Planned for the next reporting milestone.",
    notes: [
      "Recurring daily and weekly cadence",
      "Delivery list management",
      "Retention and history",
      "CSV export",
    ],
  };
}