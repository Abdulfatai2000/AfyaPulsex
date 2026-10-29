import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import type { VitalReading } from "@/types/vitals";
import { vitalConfigs } from "./config";
import { readingTime, readingValue } from "./format";
export function RecentVitals({ recent }: { recent: VitalReading[] }) {
  return (
    <section className="vt-card vt-recent">
      <div className="vt-section-heading">
        <h2>Recent Measurements</h2>
        <Link href="/my-health">View all →</Link>
      </div>
      {!recent.length ? (
        <p className="vt-muted">
          No measurements yet. Record a reading you have already taken with your
          device.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              {["Date & Time", "Type", "Value", "Note", "Actions"].map(
                (label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {recent.slice(0, 5).map((reading) => {
              const config = vitalConfigs[reading.type];
              return (
                <tr key={reading.id}>
                  <td data-label="Date & Time">
                    <time dateTime={reading.measuredAt}>
                      {readingTime(reading.measuredAt)}
                    </time>
                  </td>
                  <td data-label="Type">
                    <span className="vt-type">
                      <config.Icon size={18} aria-hidden="true" />
                      {config.label}
                    </span>
                  </td>
                  <td data-label="Value">
                    <strong>{readingValue(reading)}</strong>
                  </td>
                  <td data-label="Note">{reading.note || "No note"}</td>
                  <td data-label="Actions">
                    <details className="vt-row-actions">
                      <summary
                        aria-label={
                          "Details for " +
                          config.label +
                          " " +
                          readingTime(reading.measuredAt)
                        }
                      >
                        <MoreHorizontal aria-hidden="true" size={18} />
                      </summary>
                      <p>
                        Manually entered measurement. No medical interpretation.
                      </p>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
