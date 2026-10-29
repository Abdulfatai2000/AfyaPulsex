"use client";
import { Info, LockKeyhole } from "lucide-react";
import { SettingsCard, SettingsRow, Switch, WarningNote } from "./profile-ui";

import type { ProfileSettingsData } from "@/server/actions/citizen/profile";

export function PrivacyConsentSection({
  initial,
}: {
  initial: ProfileSettingsData["consent"];
}) {
  const contribution = initial.granted;
  return (
    <>
      <SettingsCard
        title="Your personal health tracker"
        description="Required acknowledgement — stays on for you personally."
      >
        <SettingsRow
          title="Personal tracking"
          description="AfyaPulse stores health information you intentionally submit so you can track your own health over time."
        />
        <div className="pf-row">
          <div className="pf-row-body" style={{ minWidth: 0 }}>
            <strong>Always on for your account</strong>
            <span>
              Personal tracking is part of how the citizen app works and cannot
              be turned off. This status only describes your own timeline.
            </span>
          </div>
          <LockKeyhole aria-hidden="true" />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Community health insights"
        description="Optional — helping your community, never exposing your private timeline."
      >
        <SettingsRow
          title="Contribute my eligible health signals"
          description="Eligible details are privacy-protected, aggregated, and studied as community patterns by authorized Public Health Officers."
          control={
            <Switch
              checked={contribution}
              onChange={() => {}}
              disabled={!initial.canUpdate}
              label={
                contribution
                  ? "Contribute my eligible health signals to community health insights (on)"
                  : "Contribute my eligible health signals to community health insights (off)"
              }
            />
          }
        />
        <p className="pf-muted">
          Recorded status: {contribution ? "On" : "Off"}.
          {initial.version
            ? ` Policy version: ${initial.version}.`
            : " No consent grant is recorded."}
        </p>
        <div className="pf-status pf-status-info" style={{ marginTop: 16 }}>
          <Info aria-hidden="true" />
          <span>
            Community contribution is separate from your personal tracker.
            Turning it off never reduces what your own health timeline does for
            you.
          </span>
        </div>
        <p className="pf-muted" style={{ marginTop: 14 }}>
          These are the choices you make once and review here — you will not be
          asked for the same consent with every report. A materially new purpose
          or policy change may require a fresh choice.
        </p>
      </SettingsCard>

      <WarningNote>
        Changes to community contribution are not available yet. Your personal
        health tracker remains available.
      </WarningNote>
    </>
  );
}
