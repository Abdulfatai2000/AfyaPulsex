"use client";

import { cn } from "@/server/lib/utils";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  InvestigationSummaryCounts,
  InvestigationTab,
} from "@/lib/services/officer/investigations";
import { TABS } from "@/lib/services/officer/investigations";

interface Props {
  value: InvestigationTab;
  onChange: (tab: InvestigationTab) => void;
  /** Tab counts derived from the investigation service. Null while loading. */
  counts: InvestigationSummaryCounts | null;
}

/**
 * All / Active / Pending / Escalated / Closed status tabs. Reuses the shared
 * Base UI Tabs primitive (roving-tab focus and keyboard navigation), styled as
 * the compact, count-bearing pills used across the officer portal. Counts come
 * from the investigation service — never hardcoded in the UI.
 */
export function InvestigationStatusTabs({ value, onChange, counts }: Props) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as InvestigationTab)}>
      <TabsList
        variant="default"
        className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 sm:w-fit"
      >
        {TABS.map((tab) => {
          const active = value === tab.value;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-8 flex-none gap-1.5 rounded-lg px-3 text-xs font-medium text-gray-600 data-active:bg-primary-blue data-active:text-white hover:text-deep-navy data-active:hover:text-white focus-visible:ring-primary-blue/70"
            >
              {tab.label}
              <span
                aria-hidden="true"
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500",
                )}
              >
                {counts ? counts[tab.value] : "·"}
              </span>
              <span className="sr-only">
                {counts ? `${counts[tab.value]} ${tab.label.toLowerCase()} investigations` : "loading count"}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}