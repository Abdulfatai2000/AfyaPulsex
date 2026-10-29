import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowRight, Brain } from "lucide-react";
import { getWhatChangedToday } from "@/lib/services/officer/dashboard";
import {
  resolveOfficerData,
  type OfficerDataMode,
} from "@/lib/services/officer/data-mode";
import { getWhatChangedTodayLive } from "@/lib/services/officer/live-adapters";
import { DataErrorPanel } from "@/components/officer/data-mode/DataErrorPanel";

export default async function WhatChangedToday({ mode }: { mode: OfficerDataMode }) {
  let data;
  try {
    data = await resolveOfficerData(mode, {
      demo: () => getWhatChangedToday(),
      live: () => getWhatChangedTodayLive(),
    });
  } catch (err) {
    return (
      <DataErrorPanel
        title="Unable to load today's summary"
        message={err instanceof Error ? err.message : undefined}
      />
    );
  }

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-[#08214A]">What Changed Today?</h2>
        <Link
          href={data.detailHref}
          className="flex items-center gap-1 text-xs text-[#1267E8] font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1267E8] rounded"
          aria-label="View details about what changed today"
        >
          View Details <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        <p className="text-xs text-gray-700 leading-relaxed">{data.summary}</p>
        {data.aiCaption && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-[#F4F8FD] border border-blue-100">
            <Brain className="w-3 h-3 text-[#1267E8] mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-600 leading-relaxed">{data.aiCaption}</p>
              {/* TODO(DEV4): AI caption sourced from Groq endpoint via Dev4 service — not authoritative epidemiological conclusion */}
              <p className="text-xs text-gray-400 mt-1">AI-assisted summary · Not a confirmed diagnosis</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}