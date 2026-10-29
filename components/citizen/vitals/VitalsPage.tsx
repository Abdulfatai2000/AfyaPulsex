"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { LatestVitalsCards } from "./LatestVitalsCards";
import { RecentVitals } from "./RecentVitals";
import { ProgressCard } from "./ProgressCard";
import { InfoPanel } from "./InfoPanel";
import { RecordVitalModal } from "./RecordVitalModal";
import { emptyVitals } from "./demo-data";
import type { VitalReading, VitalType } from "@/types/vitals";
import { listVitalsAction, saveVitalAction } from "@/server/actions/citizen/vitals";
import { CitizenLoading } from "../feedback/CitizenLoading";
export function VitalsPage() {
  const [confirmedReadings, setConfirmedReadings] = useState<
    VitalReading[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quickType, setQuickType] = useState<VitalType | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const readings = await listVitalsAction();
        setConfirmedReadings(readings);
      } catch {
        setError("We couldn't load your vitals. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const readings = confirmedReadings ?? emptyVitals;
  const sorted = [...readings].sort(
    (a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt),
  );

  async function handleSave(draft: import("@/types/vitals").VitalDraft) {
    return saveVitalAction(draft);
  }

  if (loading) {
    return (
      <div className="vt-page">
        <div className="vt-main-grid">
          <div className="vt-main-content">
            <header className="vt-header">
              <div>
                <h1>Vitals</h1>
                <p>Track your key health measurements.</p>
              </div>
            </header>
            <CitizenLoading message="Loading your vitals..." layout="cards" />
          </div>
          <InfoPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="vt-page">
      <div className="vt-main-grid">
        <div className="vt-main-content">
          <header className="vt-header">
            <div>
              <h1>Vitals</h1>
              <p>Track your key health measurements.</p>
            </div>
            <button className="vt-primary" onClick={() => setModalOpen(true)}>
              <Plus aria-hidden="true" size={18} />
              Record Vital
            </button>
          </header>
          {error && (
            <div className="vt-error" role="alert">
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}
          <LatestVitalsCards
            readings={sorted}
            onRecord={(type) => {
              setQuickType(type);
              setModalOpen(true);
            }}
          />
          <RecentVitals recent={sorted} />
          <ProgressCard
            empty={!readings.length}
            onRecord={() => setModalOpen(true)}
          />
        </div>
        <InfoPanel />
      </div>
      {modalOpen && (
        <RecordVitalModal
          key={quickType ?? "generic"}
          initialType={quickType ?? undefined}
          onClose={() => setModalOpen(false)}
          saveVital={handleSave}
          onSaved={setConfirmedReadings}
        />
      )}
    </div>
  );
}
