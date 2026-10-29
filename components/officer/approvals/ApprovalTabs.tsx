"use client";

import { cn } from "@/server/lib/utils";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  AccessRequestsCounts,
  ApprovalsTab,
} from "@/lib/services/officer/access-approvals";
import { APPROVAL_TABS } from "@/lib/services/officer/access-approvals";

const COUNT_KEYS: Record<ApprovalsTab, keyof AccessRequestsCounts> = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
};

interface Props {
  value: ApprovalsTab;
  onChange: (tab: ApprovalsTab) => void;
  /** Per-tab totals derived from the approvals service. Null while loading. */
  counts: AccessRequestsCounts | null;
}

/**
 * Pending / Approved / Rejected status tabs. Reuses the shared Base UI Tabs
 * primitive (roving-tab focus + keyboard navigation) styled as the compact
 * count-bearing pills used across the officer portal. Counts come from the
 * service — never hardcoded in the UI.
 */
export function ApprovalTabs({ value, onChange, counts }: Props) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as ApprovalsTab)}>
      <TabsList
        variant="default"
        className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 sm:w-fit"
      >
        {APPROVAL_TABS.map((tab) => {
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
                {counts ? counts[COUNT_KEYS[tab.value]] : "·"}
              </span>
              <span className="sr-only">
                {counts
                  ? `${counts[COUNT_KEYS[tab.value]]} ${tab.label.toLowerCase()} request${counts[COUNT_KEYS[tab.value]] === 1 ? "" : "s"}`
                  : "loading count"}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}