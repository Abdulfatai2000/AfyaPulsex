import assert from "node:assert/strict";
import test from "node:test";
import { demoMyHealth, emptyMyHealth } from "./demo-data";
import {
  dayKey,
  periodData,
  symptomCounts,
  symptomLineSeries,
  symptomSeries,
} from "./data";

test("symptom lines preserve daily totals and symptom breakdown across period filters", () => {
  for (const range of ["7", "30", "90", "180", "all"] as const) {
    const data = periodData(demoMyHealth, range);
    const before = JSON.stringify(data);
    const { rows, series } = symptomLineSeries(data);
    const value = (row: (typeof rows)[number], key: string) => Number(row[key]);
    assert.deepEqual(
      rows.map((row) => ({
        date: row.date,
        count: series.reduce((sum, { key }) => sum + value(row, key), 0),
      })),
      symptomSeries(data),
    );
    for (const { name, count } of symptomCounts(data)) {
      const seriesKey = series.find(({ label }) => label === name)!.key;
      assert.equal(
        rows.reduce((sum, row) => sum + value(row, seriesKey), 0),
        count,
      );
    }
    assert.equal(
      JSON.stringify(data),
      before,
      "source records must not change",
    );
  }
});

test("empty and single-day data do not acquire invented dates", () => {
  assert.deepEqual(symptomLineSeries(emptyMyHealth), { series: [], rows: [] });
  const event = demoMyHealth.events[0];
  const result = symptomLineSeries({ ...emptyMyHealth, events: [event] });
  assert.deepEqual(
    result.rows.map(({ date }) => date),
    [dayKey(event.startedAt)],
  );
});

test("custom symptoms use safe series keys and count duplicate mentions once per signal", () => {
  const event = demoMyHealth.events[0];
  const sameSymptom = {
    ...event,
    symptoms: [event.symptoms[0], event.symptoms[0]],
    customSymptom: event.symptoms[0],
  };
  const custom = { ...event, symptoms: [], customSymptom: "__proto__" };
  const { rows, series } = symptomLineSeries({
    ...emptyMyHealth,
    events: [sameSymptom, custom],
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(
    series.map(({ label }) => label).sort(),
    [event.symptoms[0], "__proto__"].sort(),
  );
  for (const { key } of series) assert.equal(Number(rows[0][key]), 1);
});
