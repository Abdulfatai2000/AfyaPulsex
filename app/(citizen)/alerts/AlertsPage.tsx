"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AlertDetails } from "@/components/citizen/alerts/AlertDetails";
import { AlertEmptyState } from "@/components/citizen/alerts/AlertEmptyState";
import { AlertErrorState } from "@/components/citizen/alerts/AlertErrorState";
import { AlertFilters } from "@/components/citizen/alerts/AlertFilters";
import { AlertsHeader } from "@/components/citizen/alerts/AlertsHeader";
import { AlertSkeleton } from "@/components/citizen/alerts/AlertSkeleton";
import { HealthAlertList } from "@/components/citizen/alerts/HealthAlertList";
import { emptyAlertFeed } from "@/components/citizen/alerts/demo-data";
import {
  filterAlerts,
  publishedAlerts,
  type AlertDateRange,
} from "@/components/citizen/alerts/data";
import type {
  AlertCategory,
  CitizenPublicAlert,
  CitizenAlertFeed,
} from "@/types/public-alerts";

import { getAlertsAction } from "@/server/actions/citizen/alerts";
const PAGE_SIZE = 5;

export default function AlertsPage({ personalInsights }: { personalInsights: ReactNode }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AlertCategory | "all">("all");
  const [range, setRange] = useState<AlertDateRange>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);

  const [feed, setFeed] = useState<CitizenAlertFeed>(emptyAlertFeed);
  const load = useCallback(() => {
    return getAlertsAction()
      .then(setFeed)
      .catch(() => {
        setFeed(emptyAlertFeed);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const allPublished = useMemo(() => {
    return publishedAlerts(feed);
  }, [feed]);

  const filtered = useMemo(() => {
    return filterAlerts(allPublished, query, category, range, feed.asOf);
  }, [allPublished, query, category, range, feed.asOf]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const safePage = Math.min(page, totalPages - 1);

  const visible = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const selectedAlert =
    filtered.find((alert: CitizenPublicAlert) => alert.id === selectedId) ??
    filtered[0] ??
    null;

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(0);
    setMobileDetail(false);
  };

  const handleCategoryChange = (value: AlertCategory | "all") => {
    setCategory(value);
    setPage(0);
    setMobileDetail(false);
  };

  const handleRangeChange = (value: AlertDateRange) => {
    setRange(value);
    setPage(0);
    setMobileDetail(false);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalPages) {
      return;
    }

    setPage(nextPage);
    setMobileDetail(false);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setMobileDetail(true);
    }
  };

  const handleBack = () => {
    setMobileDetail(false);
  };

  const handleClearFilters = () => {
    setQuery("");
    setCategory("all");
    setRange("all");
    setPage(0);
    setSelectedId(null);
    setMobileDetail(false);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(false);
    void load();
  };

  return (
    <div className="al-page">
      <AlertsHeader />
      {personalInsights}
      <section aria-labelledby="public-health-alerts-title">
      <h2 id="public-health-alerts-title">Public Health Alerts</h2>

      {loading && (
        <div className="al-layout">
          <div className="al-left">
            <AlertSkeleton />
          </div>

          <div className="al-right">
            <AlertSkeleton detail />
          </div>
        </div>
      )}

      {error && !loading && <AlertErrorState onRetry={handleRetry} />}

      {!loading && !error && (
        <div className="al-layout">
          <section
            className={`al-left ${
              mobileDetail ? "al-left--mobile-detail" : ""
            }`}
            aria-label="Health alerts"
          >
            {!mobileDetail && (
              <>
                <AlertFilters
                  query={query}
                  onQueryChange={handleQueryChange}
                  category={category}
                  onCategoryChange={handleCategoryChange}
                  range={range}
                  onRangeChange={handleRangeChange}
                  resultCount={filtered.length}
                />

                {allPublished.length === 0 ? <AlertEmptyState /> : filtered.length === 0 ? (
                  <div className="al-filter-empty">
                    <h3>No alerts match your filters.</h3>

                    <p>Try adjusting your search or filter choices.</p>

                    <button type="button" onClick={handleClearFilters}>
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="al-list-wrap">
                    <HealthAlertList
                      alerts={visible}
                      selected={selectedAlert?.id}
                      onSelect={handleSelect}
                      page={safePage}
                      pages={totalPages}
                      onPage={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}

            {mobileDetail && selectedAlert && (
              <div className="al-mobile-detail">
                <AlertDetails
                  alert={selectedAlert}
                  onBack={handleBack}
                  demo={false}
                />
              </div>
            )}
          </section>

          <aside className="al-right" aria-label="Selected health alert">
            {allPublished.length === 0 ? null : filtered.length === 0 ? (
              <AlertEmptyState />
            ) : selectedAlert ? (
              <AlertDetails
                alert={selectedAlert}
                onBack={() => setSelectedId(null)}
                demo={false}
              />
            ) : (
              <div className="al-detail-card">
                <h3 className="al-select-title">Select an alert</h3>

                <p className="al-muted">
                  Choose an alert from the list to view full details.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
      </section>
    </div>
  );
}
