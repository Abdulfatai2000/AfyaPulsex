import type { MyHealthData } from "@/types/my-health";
import type { VitalType } from "@/types/vitals";
import { vitalConfigs } from "../vitals/config";
import {
  bodyCounts,
  severitySeries,
  symptomCounts,
  symptomLineSeries,
  vitalSeries,
} from "./data";
import { HealthChart } from "./HealthChart";
export type TrendCategory = "Symptoms" | "Severity" | "Body Areas" | "Vitals";
function Limited({ children }: { children: string }) {
  return (
    <div className="mh-empty" role="status">
      <h3>Not enough data yet</h3>
      <p>{children}</p>
    </div>
  );
}
export function HealthTrends({
  data,
  category,
  onCategory,
  vital,
  onVital,
}: {
  data: MyHealthData;
  category: TrendCategory;
  onCategory: (value: TrendCategory) => void;
  vital: VitalType;
  onVital: (value: VitalType) => void;
}) {
  const frequency = symptomLineSeries(data);
  const severity = severitySeries(data);
  const bodies = bodyCounts(data);
  const values = vitalSeries(data, vital);
  const sufficient = (rows: { date: string }[]) =>
    new Set(rows.map((row) => row.date)).size >= 2;
  const unit =
    vital === "temperature"
      ? "°C"
      : vital === "weight"
        ? "kg"
        : vitalConfigs[vital].units[0];
  return (
    <section className="mh-card">
      <h2>Your recorded trends</h2>
      <p className="mh-muted">
        Based only on loaded records in the selected period. Gaps do not imply
        symptom-free days.
      </p>
      <div className="mh-trend-select">
        <label htmlFor="mh-category">Trend category</label>
        <select
          id="mh-category"
          value={category}
          onChange={(e) => onCategory(e.target.value as TrendCategory)}
        >
          {["Symptoms", "Severity", "Body Areas", "Vitals"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {category === "Symptoms" && (
        <>
          <h3>Symptom frequency over time</h3>
          <p>
            Each line counts one symptom across the health signals recorded that
            day. Only recorded days are shown. Zero means the symptom was not
            listed in those signals; gaps do not mean symptom-free days.
          </p>
          {sufficient(frequency.rows) && frequency.series.length > 0 ? (
            <HealthChart
              rows={frequency.rows}
              series={frequency.series}
              integerCounts
              unit="occurrences"
              domain={[
                0,
                Math.max(
                  1,
                  ...frequency.rows.flatMap((row) =>
                    frequency.series.map(({ key }) => Number(row[key])),
                  ),
                ),
              ]}
            />
          ) : (
            <Limited>
              Keep recording health signals on different days to see trends over
              time.
            </Limited>
          )}
          <h3>Symptom breakdown</h3>
          <ul className="mh-ranks">
            {symptomCounts(data).map((row) => (
              <li key={row.name}>
                <span>{row.name}</span>
                <strong>{row.count}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
      {category === "Severity" && (
        <>
          <h3>Recorded severity over time</h3>
          {severity.length > 0 && (
            <p>
              Your average recorded severity was{" "}
              {(
                severity.reduce((sum, row) => sum + row.severity, 0) /
                severity.length
              ).toFixed(1)}
              /10 during this period.
            </p>
          )}
          {sufficient(severity) ? (
            <HealthChart
              rows={severity}
              series={[{ key: "severity", label: "Recorded severity" }]}
              unit="out of 10"
              domain={[0, 10]}
            />
          ) : (
            <Limited>
              Record more health signals at different times to see severity
              history.
            </Limited>
          )}
        </>
      )}
      {category === "Body Areas" && (
        <>
          <h3>Recorded body areas</h3>
          <p>Number of health signals mentioning each broad body area.</p>
          {bodies.length ? (
            <ul className="mh-ranks">
              {bodies.map((row) => (
                <li key={row.name}>
                  <span>{row.name}</span>
                  <strong>{row.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <Limited>Not enough body-area data yet.</Limited>
          )}
        </>
      )}
      {category === "Vitals" && (
        <>
          <div className="mh-trend-select">
            <label htmlFor="mh-vital-trend">Vital type</label>
            <select
              id="mh-vital-trend"
              value={vital}
              onChange={(e) => onVital(e.target.value as VitalType)}
            >
              {Object.entries(vitalConfigs).map(([key, config]) => (
                <option value={key} key={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <h3>
            {vitalConfigs[vital].label} history ({unit})
          </h3>
          <p>
            {values.length} recorded measurements in this period.{" "}
            {vital === "temperature"
              ? "Fahrenheit readings are converted to Celsius."
              : vital === "weight"
                ? "Pound readings are converted to kilograms."
                : "Readings are shown without medical classification."}
          </p>
          {sufficient(values) ? (
            <HealthChart
              rows={values}
              series={
                vital === "blood_pressure"
                  ? [
                      { key: "systolic", label: "Systolic" },
                      { key: "diastolic", label: "Diastolic" },
                    ]
                  : [{ key: "value", label: vitalConfigs[vital].label }]
              }
              unit={unit}
            />
          ) : (
            <Limited>
              {"Record more " +
                vitalConfigs[vital].label.toLowerCase() +
                " readings at different times to see a trend."}
            </Limited>
          )}
        </>
      )}
    </section>
  );
}
