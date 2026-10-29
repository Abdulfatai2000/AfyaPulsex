import {
  Lightbulb,
  ShieldCheck,
  ArrowUp,
  ChartColumn,
  HeartPulse,
  MapPin,
} from "lucide-react";
import type { HealthInsight, MyHealthData } from "@/types/my-health";
import { insights } from "./data";
export function HealthInsights({
  data,
  approvedInsights,
  compact = false,
}: {
  data: MyHealthData;
  approvedInsights?: HealthInsight[];
  compact?: boolean;
}) {
  // TODO(DEV4): replace demo insight adapter with approved server-generated non-diagnostic response.
  // Undefined/failed AI output falls back to deterministic observations, without an AI request.
  const cards = approvedInsights?.length ? approvedInsights : insights(data);
  return (
    <div className={compact ? "mh-insights" : "mh-insights mh-insight-grid"}>
      <section className="mh-card">
        <h2>
          <Lightbulb
            className="mh-heading-amber"
            aria-hidden="true"
            size={24}
          />
          Recent Insights
        </h2>
        <p className="mh-muted">
          Factual observations from loaded records in the selected period.
        </p>
        {cards.length ? (
          cards.map((card) => {
            const Icon =
              card.id === "activity"
                ? ArrowUp
                : card.id === "vitals"
                  ? HeartPulse
                  : card.id === "body"
                    ? MapPin
                    : ChartColumn;
            const tone =
              card.id === "activity"
                ? "green"
                : card.id === "vitals"
                  ? "rose"
                  : "purple";
            return (
              <article className="mh-insight" key={card.id}>
                <span className={`mh-insight-icon mh-tone-${tone}`}>
                  <Icon aria-hidden="true" size={22} />
                </span>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.observation}</p>
                </div>
              </article>
            );
          })
        ) : (
          <div className="mh-empty">
            <h3>Not enough data yet</h3>
            <p>
              Keep recording your health signals and vitals to see simple
              observations over time.
            </p>
          </div>
        )}
      </section>
      <section className="mh-card mh-notice mh-safety">
        <h2>
          <ShieldCheck aria-hidden="true" size={20} />
          This is not a diagnosis
        </h2>
        <p>
          AfyaPulse helps you understand your recorded health history. It does
          not provide medical diagnosis or treatment advice.
        </p>
      </section>
    </div>
  );
}
