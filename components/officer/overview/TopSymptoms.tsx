import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getTopSymptoms,
  TIMEFRAME_LABELS,
  type Timeframe,
} from "@/lib/services/officer/dashboard";
import {
  resolveOfficerData,
  type OfficerDataMode,
} from "@/lib/services/officer/data-mode";
import { getTopSymptomsLive } from "@/lib/services/officer/live-adapters";
import { DataErrorPanel } from "@/components/officer/data-mode/DataErrorPanel";

interface Props {
  timeframe: Timeframe;
  mode: OfficerDataMode;
}

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-[#C63C3C]",
  moderate: "bg-[#D99000]",
  low: "bg-[#20BFD0]",
};

const SEVERITY_LABEL: Record<string, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
};

export default async function TopSymptoms({ timeframe, mode }: Props) {
  let symptoms;
  try {
    symptoms = await resolveOfficerData(mode, {
      demo: () => getTopSymptoms(timeframe),
      live: () => getTopSymptomsLive(timeframe),
    });
  } catch (err) {
    return (
      <DataErrorPanel
        title="Unable to load top symptoms"
        message={err instanceof Error ? err.message : undefined}
      />
    );
  }
  const maxCount = Math.max(...symptoms.map((s) => s.count), 1);

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardHeader className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-[#08214A]">Top Symptoms</h2>
        <p className="text-xs text-gray-400">
          {TIMEFRAME_LABELS[timeframe] ?? `Last ${timeframe}`}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {symptoms.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No symptoms recorded for this period.</p>
        ) : (
          <ul className="space-y-2" aria-label="Top reported symptoms">
            {symptoms.map((symptom) => (
              <li key={symptom.rank} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[symptom.severity]}`}
                  aria-label={`${SEVERITY_LABEL[symptom.severity]} severity`}
                />
                <span className="text-xs text-gray-700 w-24 flex-shrink-0 truncate">{symptom.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-[#1267E8]/60"
                    style={{ width: `${Math.round((symptom.count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-[#08214A] w-6 text-right flex-shrink-0">
                  {symptom.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}