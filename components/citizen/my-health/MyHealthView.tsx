"use client";
import { useState, type KeyboardEvent, useEffect } from "react";
import {
  Info,
  Search,
  ChartNoAxesColumnIncreasing,
  Filter,
  FileText,
  HeartPulse,
  CalendarDays,
} from "lucide-react";
import type { HealthInsight } from "@/types/my-health";
import type { VitalType } from "@/types/vitals";
import { vitalConfigs } from "../vitals/config";
import { emptyMyHealth } from "./demo-data";
import {
  dayKey,
  periodData,
  ranges,
  symptoms,
  timeline,
  type DateRange,
} from "./data";
import { HealthTimeline } from "./HealthTimeline";
import { HealthTrends, type TrendCategory } from "./HealthTrends";
import { HealthInsights } from "./HealthInsights";
import { getMyHealthDataAction, type MyHealthDataDTO } from "@/server/actions/citizen/my-health";
const tabs = ["Timeline", "Trends", "Insights"] as const;
type Tab = (typeof tabs)[number];
export function MyHealthView({
  approvedInsights,
}: {
  approvedInsights?: { asOf: string; range: DateRange; items: HealthInsight[] };
}) {
  const [tab, setTab] = useState<Tab>("Timeline");
  const [range, setRange] = useState<DateRange>("90");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [vitalFilter, setVitalFilter] = useState("all");
  const [limit, setLimit] = useState(8);
  const [category, setCategory] = useState<TrendCategory>("Symptoms");
  const [vital, setVital] = useState<VitalType>("temperature");
  const [data, setData] = useState<MyHealthDataDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await getMyHealthDataAction();
        setData(result);
      } catch {
        setError("We couldn't load your health history. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const source = data ?? emptyMyHealth;
  const period = periodData(source, range);
  const all = timeline(source);
  const items = timeline(period).filter((item) => {
    if (
      (type === "events" && item.kind !== "event") ||
      (type === "vitals" && item.kind !== "vital")
    )
      return false;
    if (
      type === "vitals" &&
      vitalFilter !== "all" &&
      item.kind === "vital" &&
      item.record.type !== vitalFilter
    )
      return false;
    const text =
      item.kind === "event"
        ? [
            ...symptoms(item.record),
            ...(item.record.bodyAreas || []),
            item.record.notes,
          ].join(" ")
        : vitalConfigs[item.record.type].label + " " + (item.record.note || "");
    return text.toLowerCase().includes(query.trim().toLowerCase());
  });
  function clear() {
    setQuery("");
    setType("all");
    setVitalFilter("all");
    setRange("all");
    setLimit(8);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % 3;
    else if (event.key === "ArrowLeft") next = (index + 2) % 3;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 2;
    else return;
    event.preventDefault();
    setTab(tabs[next]);
    document.getElementById("mh-tab-" + tabs[next])?.focus();
  }
return (
    <div className="mh-page">
      <header className="mh-header">
        <div>
          <h1>My Health</h1>
          <p>Your personal health history, trends and insights.</p>
        </div>
        <label className="mh-range">
          Date range
          <select
            value={range}
            onChange={(e) => {
              setRange(e.target.value as DateRange);
              setLimit(8);
            }}
          >
            {Object.entries(ranges).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </header>
      {loading && (
        <div className="mh-demo">
          <p><strong>Loading your health history...</strong></p>
        </div>
      )}
      {error && (
        <div className="mh-card mh-empty" role="alert">
          <h2>We could not load your health history.</h2>
          <p>Your tab and filter choices are kept.</p>
          <button onClick={() => { setLoading(true); setError(null); }}>
            Try Again
          </button>
        </div>
      )}
      <div role="tablist" aria-label="My Health sections" className="mh-tabs">
        {tabs.map((name, index) => (
          <button
            key={name}
            role="tab"
            id={"mh-tab-" + name}
            aria-controls={"mh-panel-" + name}
            aria-selected={tab === name}
            tabIndex={tab === name ? 0 : -1}
            onKeyDown={(e) => keyboard(e, index)}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <section
        role="tabpanel"
        id={"mh-panel-" + tab}
        aria-labelledby={"mh-tab-" + tab}
        tabIndex={0}
      >
        <p className="mh-period">
          Showing loaded records · {ranges[range]} · through{" "}
          {dayKey(source.asOf)} (WAT)
        </p>
        {!loading && !error && (
          <>
            {tab === "Timeline" && (
              <>
                <div className="mh-notice mh-privacy">
                  <Info aria-hidden="true" />
                  <div>
                    <strong>
                      This is your personal health history. Only you can see
                      this information.
                    </strong>
                    <p>
                      Keep tracking your symptoms and vitals to understand your
                      health history over time.
                    </p>
                  </div>
                </div>
                <div className="mh-layout">
                  <div>
                    <HealthTimeline
                      toolbar={
                        <div className="mh-search">
                          <Search size={18} aria-hidden="true" />
                          <label className="sr-only" htmlFor="mh-search">
                            Search your records
                          </label>
                          <input
                            id="mh-search"
                            placeholder="Search your records..."
                            value={query}
                            onChange={(e) => {
                              setQuery(e.target.value);
                              setLimit(8);
                            }}
                          />
                        </div>
                      }
                      items={items}
                      total={all.length}
                      limit={limit}
                      onMore={() => setLimit(limit + 8)}
                      onClear={clear}
                    />
                  </div>
                  <aside className="mh-side">
                    <section className="mh-card">
                      <h2>
                        <ChartNoAxesColumnIncreasing
                          className="mh-heading-blue"
                          aria-hidden="true"
                          size={24}
                        />
                        Quick Stats
                      </h2>
                      <p className="mh-muted">
                        Loaded records in the selected period.
                      </p>
                      <dl className="mh-stats">
                        <div className="mh-tone-rose">
                          <FileText aria-hidden="true" size={23} />
                          <dt>Total records</dt>
                          <dd>{period.events.length + period.vitals.length}</dd>
                        </div>
                        <div>
                          <ChartNoAxesColumnIncreasing
                            aria-hidden="true"
                            size={23}
                          />
                          <dt>Health signals</dt>
                          <dd>{period.events.length}</dd>
                        </div>
                        <div>
                          <HeartPulse aria-hidden="true" size={23} />
                          <dt>Vital readings</dt>
                          <dd>{period.vitals.length}</dd>
                        </div>
                        <div>
                          <CalendarDays aria-hidden="true" size={23} />
                          <dt>Days with records</dt>
                          <dd>
                            {
                              new Set(timeline(period).map((i) => dayKey(i.at)))
                                .size
                            }
                          </dd>
                        </div>
                      </dl>
                    </section>
                    <section className="mh-card mh-filters">
                      <h2>
                        <Filter
                          className="mh-heading-blue"
                          aria-hidden="true"
                          size={24}
                        />
                        Filters
                      </h2>
                      <p className="mh-muted">
                        Show specific types of records.
                      </p>
                      <div
                        className="mh-filter-pills"
                        role="group"
                        aria-label="Record type"
                      >
                        {[
                          ["all", "All"],
                          ["events", "Health Signals"],
                          ["vitals", "Vitals"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            aria-pressed={type === value}
                            onClick={() => {
                              setType(value);
                              setLimit(8);
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {type === "vitals" && (
                        <label>
                          Vital type filter
                          <select
                            value={vitalFilter}
                            onChange={(e) => {
                              setVitalFilter(e.target.value);
                              setLimit(8);
                            }}
                          >
                            <option value="all">All vital types</option>
                            {Object.entries(vitalConfigs).map(
                              ([key, config]) => (
                                <option key={key} value={key}>
                                  {config.label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      )}
                      <button onClick={clear}>Clear filters and search</button>
                    </section>
                    <HealthInsights data={period} compact />
                  </aside>
                </div>
              </>
            )}
            {tab === "Trends" && (
              <HealthTrends
                data={period}
                category={category}
                onCategory={setCategory}
                vital={vital}
                onVital={setVital}
              />
            )}
            {tab === "Insights" && (
              <HealthInsights
                data={period}
                approvedInsights={
                  approvedInsights?.asOf === source.asOf &&
                  approvedInsights.range === range
                    ? approvedInsights.items
                    : undefined
                }
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
