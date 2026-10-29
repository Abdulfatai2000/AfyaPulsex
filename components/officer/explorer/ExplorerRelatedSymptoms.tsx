"use client";

import type { ExplorerRelatedSymptom } from "@/lib/services/officer/explorer";

export function ExplorerRelatedSymptoms({
  symptoms,
}: {
  symptoms: ExplorerRelatedSymptom[];
}) {
  const max = Math.max(1, ...symptoms.map((s) => s.count ?? 0));

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-deep-navy">Related symptoms</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Top reported symptoms in scope
      </p>

      {symptoms.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No related symptoms to show for the current selection.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {symptoms.map((item, index) => (
            <li key={item.symptom} className="flex items-center gap-2.5">
              <span className="w-4 shrink-0 text-right text-xs font-medium text-gray-400">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-gray-600">{item.symptom}</span>
                  <span className="ml-2 shrink-0 font-medium text-deep-navy">
                    {item.count?.toLocaleString()}
                  </span>
                </div>
                <div
                  className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100"
                  role="presentation"
                >
                  <div
                    className="h-2 rounded-full bg-teal/70"
                    style={{
                      width: `${Math.max(4, Math.round(((item.count ?? 0) / max) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}