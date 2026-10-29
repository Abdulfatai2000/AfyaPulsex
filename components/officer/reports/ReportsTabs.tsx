"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { ReportsViewTab } from "@/lib/services/officer/reports";
import { REPORT_TABS } from "@/lib/services/officer/reports";

interface Props {
  value: ReportsViewTab;
  onChange: (tab: ReportsViewTab) => void;
}

/**
 * Standard Reports / Custom Report / Scheduled Reports tabs. Reuses the shared
 * Base UI Tabs primitive (roving-tab focus and keyboard navigation), styled as
 * the compact pills used across the officer portal with the blue active state.
 */
export function ReportsTabs({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as ReportsViewTab)}>
      <TabsList
        variant="default"
        className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 sm:w-fit"
      >
        {REPORT_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-8 flex-none gap-1.5 rounded-lg px-3 text-xs font-medium text-gray-600 data-active:bg-primary-blue data-active:text-white hover:text-deep-navy data-active:hover:text-white focus-visible:ring-primary-blue/70"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}