import { AnalyticsTabs } from "@/components/officer/analytics/AnalyticsTabs";
import { getServerDataMode } from "@/lib/services/officer/data-mode-server";

export default async function AnalyticsPage() {
  // Centralized Data Mode: the key remounts the tabs on Demo/Live switches
  // (set by DataModeProvider via session cookie + router.refresh()).
  const mode = await getServerDataMode();
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-deep-navy">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate, privacy-safe epidemiological intelligence for your
          jurisdiction  symptom trends, condition activity, demographics,
          reporting trends, geographic comparison, and community vitals.
        </p>
      </div>
      <AnalyticsTabs key={mode} />
    </section>
  );
}