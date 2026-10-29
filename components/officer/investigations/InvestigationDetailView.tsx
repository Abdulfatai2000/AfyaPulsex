"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ShieldAlert } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { InvestigationDetail } from "@/lib/services/officer/investigations";
import { formatInvestigationDate, tabForStatus } from "@/lib/services/officer/investigations";
import {
  InvestigationPriorityBadge,
  InvestigationStatusBadge,
} from "./InvestigationStatusBadge";
import { InvestigationOverview } from "./InvestigationOverview";
import { InvestigationTrends } from "./InvestigationTrends";
import { InvestigationNotes } from "./InvestigationNotes";
import { InvestigationActions } from "./InvestigationActions";
import { InvestigationMap } from "./InvestigationMap";
import { InvestigationDemographics } from "./InvestigationDemographics";
import { InvestigationRelatedSymptoms } from "./InvestigationRelatedSymptoms";

const DETAIL_TABS = [
  { value: "overview", label: "Overview" },
  { value: "trends", label: "Trends" },
  { value: "map", label: "Map" },
  { value: "related-symptoms", label: "Related Symptoms" },
  { value: "demographics", label: "Demographics" },
  { value: "notes", label: "Notes" },
  { value: "actions", label: "Actions" },
];

/**
 * Development-boundary tab: renders the existing placeholder view for a tab
 * whose aggregate backend data is not yet supplied (DEV3), with a clear note
 * that nothing is fabricated and nothing individual is ever shown.
 */
function DevelopmentTab({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="rounded-xl border border-border bg-white p-4">
        <h3 className="text-sm font-semibold text-deep-navy">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

interface Props {
  detail: InvestigationDetail;
  onAddNote: (body: string) => Promise<unknown>;
  onAssign: (team: string) => Promise<unknown>;
  onEscalate: () => Promise<unknown>;
  onMonitor: () => Promise<unknown>;
  onClose: () => Promise<unknown>;
}

/**
 * Presentational detail view for a single aggregate investigation. It reads
 * the detail payload passed in and performs NO fetching or auth decisions
 * itself; Officer Actions are threaded through the service-backed client.
 */
export function InvestigationDetailView({
  detail,
  onAddNote,
  onAssign,
  onEscalate,
  onMonitor,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState(DETAIL_TABS[0].value);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link
        href={`/officer/investigations?tab=${tabForStatus(detail.status)}`}
        className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-medium text-deep-navy outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary-blue/60"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        Back to Investigations
      </Link>

      <header className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="min-w-0 text-xl font-bold leading-snug text-deep-navy sm:text-2xl">
              {detail.title}
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                Detected on{" "}
                <time dateTime={detail.detectedOn}>
                  {formatInvestigationDate(detail.detectedOn)}
                </time>
              </span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1.5">
                ID{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                  {detail.key}
                </code>
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InvestigationPriorityBadge priority={detail.priority} />
            <InvestigationStatusBadge status={detail.status} />
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 sm:w-fit">
          {DETAIL_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-8 flex-none rounded-lg px-3 text-xs font-medium text-gray-600 data-active:bg-primary-blue data-active:text-white hover:text-deep-navy data-active:hover:text-white focus-visible:ring-primary-blue/70"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <InvestigationOverview
            detail={detail}
            onAddNote={onAddNote}
            onAssign={onAssign}
            onEscalate={onEscalate}
            onMonitor={onMonitor}
            onClose={onClose}
          />
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <InvestigationTrends detail={detail} />
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <DevelopmentTab
            title="Map"
            description="The signal map will render this aggregate investigation's location using the same shared geography used by Signal Map and Signal Explorer."
          >
            <InvestigationMap />
          </DevelopmentTab>
        </TabsContent>

        <TabsContent value="related-symptoms" className="mt-4">
          <DevelopmentTab
            title="Related Symptoms"
            description="Related aggregate symptom activity for the jurisdiction area once the backend pipeline supplies it — aggregate only, never individual submissions."
          >
            <InvestigationRelatedSymptoms />
          </DevelopmentTab>
        </TabsContent>

        <TabsContent value="demographics" className="mt-4">
          <DevelopmentTab
            title="Demographics"
            description="Aggregate, de-identified demographic indicators for this investigation's jurisdiction once the backend pipeline supplies it."
          >
            <InvestigationDemographics />
          </DevelopmentTab>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <InvestigationNotes detail={detail} onAddNote={onAddNote} />
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <div className="max-w-md min-w-0">
            <InvestigationActions
              detail={detail}
              onAddNote={onAddNote}
              onAssign={onAssign}
              onEscalate={onEscalate}
              onMonitor={onMonitor}
              onClose={onClose}
            />
          </div>
        </TabsContent>
      </Tabs>

      <footer className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <p>
          Note: Results are aggregated to protect privacy. Individual records
          are not shown.
        </p>
      </footer>
    </div>
  );
}