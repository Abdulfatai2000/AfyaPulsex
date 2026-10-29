"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { AnalyticsTabId } from "@/lib/services/officer/analytics";
import { ANALYTICS_SIMULATION_NOTICE, ANALYTICS_TABS } from "@/lib/services/officer/analytics";
import { SymptomAnalytics } from "./SymptomAnalytics";
import { ConditionAnalytics } from "./ConditionAnalytics";
import { DemographicAnalytics } from "./DemographicAnalytics";
import { TrendAnalytics } from "./TrendAnalytics";
import { GeographicAnalytics } from "./GeographicAnalytics";
import { VitalAnalytics } from "./VitalAnalytics";

const DEFAULT_TAB: AnalyticsTabId = "symptoms";

export function AnalyticsTabs() {
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>(DEFAULT_TAB);

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-clip">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const next = ANALYTICS_TABS.find((tab) => tab.id === value);
          setActiveTab(next ? next.id : DEFAULT_TAB);
        }}
      >
        <TabsList
          variant="line"
          className="max-w-full flex-wrap lg:flex-nowrap lg:overflow-x-auto"
          aria-label="Analytics views"
        >
          {ANALYTICS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-2 text-xs sm:px-3 sm:text-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="symptoms" className="mt-4">
          <SymptomAnalytics />
        </TabsContent>

        <TabsContent value="conditions" className="mt-4">
          <ConditionAnalytics />
        </TabsContent>

        <TabsContent value="demographics" className="mt-4">
          <DemographicAnalytics />
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <TrendAnalytics />
        </TabsContent>

        <TabsContent value="geographic" className="mt-4">
          <GeographicAnalytics />
        </TabsContent>

        <TabsContent value="vital" className="mt-4">
          <VitalAnalytics />
        </TabsContent>
      </Tabs>

      <p role="note" className="text-[10px] leading-relaxed text-gray-400">
        {ANALYTICS_SIMULATION_NOTICE}
      </p>
    </div>
  );
}