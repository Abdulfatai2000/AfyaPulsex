"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ProfileTabValue =
  | "profile"
  | "security"
  | "notifications"
  | "preferences"
  | "data-access";

export const PROFILE_TABS: ReadonlyArray<{
  value: ProfileTabValue;
  label: string;
}> = [
  { value: "profile", label: "Profile" },
  { value: "security", label: "Security" },
  { value: "notifications", label: "Notifications" },
  { value: "preferences", label: "Preferences" },
  { value: "data-access", label: "Data Access" },
];

interface Props {
  value: ProfileTabValue;
  onChange: (tab: ProfileTabValue) => void;
}

/**
 * Profile & Settings tab strip — Profile is the default active tab. Uses the
 * shared Base UI Tabs primitive (roving-tab focus + keyboard navigation)
 * styled to match the officer portal's active-blue pill pattern.
 */
export function ProfileTabs({ value, onChange }: Props) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as ProfileTabValue)}
    >
      <TabsList
        variant="default"
        className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 sm:w-fit"
      >
        {PROFILE_TABS.map((tab) => {
          const active = value === tab.value;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-8 flex-none gap-1.5 rounded-lg px-3 text-xs font-medium text-gray-600 data-active:bg-primary-blue data-active:text-white hover:text-deep-navy data-active:hover:text-white focus-visible:ring-primary-blue/70"
            >
              {tab.label}
              <span className="sr-only">
                {active ? "Active tab" : ""}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}