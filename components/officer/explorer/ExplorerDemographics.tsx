"use client";

import type { ExplorerDemographics } from "@/lib/services/officer/explorer";

function DemographicBars({
  label,
  values,
}: {
  label: string;
  values: ReadonlyArray<{ label: string; count: number | null }>;
}) {
  const max = Math.max(1, ...values.map((v) => v.count ?? 0));

  return (
    <div>
      <h4 className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </h4>
      <div className="mt-2 flex flex-col gap-2.5">
        {values.map((bucket) => (
          <div key={bucket.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{bucket.label}</span>
              <span className="font-medium text-deep-navy">
                {bucket.count === null ? "Insufficient" : bucket.count.toLocaleString()}
              </span>
            </div>
            <div
              className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100"
              role="presentation"
            >
              {bucket.count !== null && (
                <div
                  className="h-2 rounded-full bg-primary-blue/70"
                  style={{
                    width: `${Math.max(4, Math.round((bucket.count / max) * 100))}%`,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExplorerDemographics({
  demographics,
}: {
  demographics: ExplorerDemographics | null;
}) {
  if (!demographics) {
    return (
      <section className="rounded-xl border border-border bg-white p-4">
        <h3 className="text-sm font-semibold text-deep-navy">Demographics</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Demographics are unavailable when every signal group is suppressed.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-deep-navy">Demographics</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Aggregate split across sufficient signal groups
      </p>
      <div className="mt-3 flex flex-col gap-4">
        <DemographicBars label="By age group" values={demographics.ageGroups} />
        <DemographicBars label="By sex" values={demographics.sexes} />
      </div>
    </section>
  );
}