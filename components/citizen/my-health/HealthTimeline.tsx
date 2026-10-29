import Link from "next/link";
import { ClipboardList } from "lucide-react";
import type { ReactNode } from "react";
import { recordAppearance } from "./appearance";
import type { TimelineItem } from "@/types/my-health";
import { vitalConfigs } from "../vitals/config";
import { readingTime, readingValue } from "../vitals/format";
import { symptoms } from "./data";
const durations: Record<string, string> = {
  "<1h": "Less than 1 hour",
  "1-6h": "1–6 hours",
  "6-24h": "6–24 hours",
  "1-3d": "1–3 days",
  "4-7d": "4–7 days",
  "1w+": "More than 1 week",
};
export function HealthTimeline({
  items,
  total,
  limit,
  onMore,
  onClear,
  toolbar,
}: {
  items: TimelineItem[];
  total: number;
  limit: number;
  onMore: () => void;
  onClear: () => void;
  toolbar?: ReactNode;
}) {
  return (
    <section className="mh-card">
      <div className="mh-timeline-heading">
        <h2>Health Timeline</h2>
        {toolbar}
      </div>
      <p className="mh-muted">
        A chronological view of your health signals and vital readings. Dates
        shown in WAT.
      </p>
      {!total ? (
        <div className="mh-empty" role="status">
          <ClipboardList aria-hidden="true" size={32} />
          <h3>No health history yet</h3>
          <p>
            Your health signals and vital readings will appear here after you
            record them.
          </p>
          <div className="mh-actions">
            <Link href="/report">Report Health Signal</Link>
            <Link href="/vitals">Record a Vital</Link>
          </div>
        </div>
      ) : !items.length ? (
        <div className="mh-empty" role="status">
          <h3>No matching records</h3>
          <p>Try another search or date range.</p>
          <button onClick={onClear}>Clear filters and search</button>
        </div>
      ) : (
        <>
          <p className="mh-count" role="status">
            {items.length} matching records
          </p>
          <ol className="mh-timeline">
            {items.slice(0, limit).map((item) => {
              const isEvent = item.kind === "event";
              const { Icon, tone } = recordAppearance(item);
              return (
                <li key={item.id} className={`mh-tone-${tone}`}>
                  <time dateTime={item.at}>
                    <strong>
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "Africa/Lagos",
                      }).format(new Date(item.at))}
                    </strong>
                    <span>
                      {new Intl.DateTimeFormat("en-GB", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Africa/Lagos",
                      }).format(new Date(item.at))}{" "}
                      WAT
                    </span>
                  </time>
                  <span className={`mh-record-icon mh-tone-${tone}`}>
                    <Icon aria-hidden="true" size={22} />
                  </span>
                  <div className="mh-record-body">
                    <span
                      className={
                        "mh-badge " +
                        (isEvent ? `mh-event mh-tone-${tone}` : "mh-vital")
                      }
                    >
                      {isEvent ? "Health Signal" : "Vital"}
                    </span>
                    <h3>
                      {isEvent
                        ? symptoms(item.record).join(" + ")
                        : vitalConfigs[item.record.type].label}
                    </h3>
                    {item.kind === "event" ? (
                      <>
                        <p>
                          Severity: {item.record.severity}/10 ·{" "}
                          {item.record.severity <= 3
                            ? "Mild"
                            : item.record.severity <= 6
                              ? "Moderate"
                              : "Severe"}
                        </p>
                        {item.record.duration && (
                          <p>
                            Duration:{" "}
                            {durations[item.record.duration] ||
                              item.record.duration}
                          </p>
                        )}
                        {!!item.record.bodyAreas?.length && (
                          <p>Body area: {item.record.bodyAreas.join(", ")}</p>
                        )}
                        {item.record.notes && <p>Note: {item.record.notes}</p>}
                        <details>
                          <summary>View details</summary>
                          {item.record.recurrence && (
                            <p>Recurrence: {item.record.recurrence}</p>
                          )}
                          {item.record.trigger && (
                            <p>Trigger: {item.record.trigger}</p>
                          )}
                          <p>Recorded: {readingTime(item.record.createdAt)}</p>
                          <p>
                            One health signal containing{" "}
                            {symptoms(item.record).length} symptom(s).
                          </p>
                        </details>
                      </>
                    ) : (
                      <>
                        <p className="mh-reading">
                          {readingValue(item.record)}
                        </p>
                        {item.record.note && <p>Note: {item.record.note}</p>}
                        <details>
                          <summary>View details</summary>
                          <p>
                            Manually entered measurement, without medical
                            interpretation.
                          </p>
                        </details>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {limit < items.length && (
            <button className="mh-load" onClick={onMore}>
              Load more records ({items.length - limit} remaining)
            </button>
          )}
        </>
      )}
    </section>
  );
}
