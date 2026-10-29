"use client";
import { ShieldCheck, LockKeyhole, Users } from "lucide-react";
import type { PrivacyDraft, OnboardingErrors } from "@/types/onboarding";
import { TermsPrivacyModal } from "@/components/shared/TermsPrivacyModal";

export function ConsentStep({
  value,
  onChange,
  errors,
}: {
  value: PrivacyDraft;
  onChange: (value: PrivacyDraft) => void;
  errors: OnboardingErrors;
}) {
  const contribution = value.communityContribution.decision === "granted";
  return (
    <div className="ob-consent">
      <section
        className="ob-consent-card"
        aria-labelledby="required-consent-heading"
      >
        <div className="ob-consent-title">
          <LockKeyhole aria-hidden="true" />
          <div>
            <span className="ob-badge">Required acknowledgement</span>
            <h2 id="required-consent-heading">Your personal health tracker</h2>
          </div>
        </div>
        <p>
          AfyaPulse stores health information you intentionally submit so you
          can track your own health over time.
        </p>
        <label className="ob-choice">
          <input
            id="personalTrackingAcknowledged"
            type="checkbox"
            checked={value.personalTrackingAcknowledged}
            onChange={(e) =>
              onChange({
                ...value,
                personalTrackingAcknowledged: e.target.checked,
              })
            }
            required
            aria-invalid={
              errors.personalTrackingAcknowledged ? true : undefined
            }
            aria-describedby={
              errors.personalTrackingAcknowledged
                ? "acknowledgement-error"
                : undefined
            }
          />
          <span>
            I understand that the health information I choose to submit is
            stored to provide my personal health tracker.
          </span>
        </label>
        {errors.personalTrackingAcknowledged && (
          <p id="acknowledgement-error" className="ob-error">
            {errors.personalTrackingAcknowledged}
          </p>
        )}
        <div className="ob-policy-placeholders">
          <TermsPrivacyModal
            trigger={(openModal) => (
              <button
                type="button"
                className="ap-terms-link"
                onClick={openModal}
              >
                View Terms of Use &amp; Privacy Notice
              </button>
            )}
          />
        </div>
      </section>
      <section
        className="ob-consent-card ob-community-choice"
        aria-labelledby="community-consent-heading"
      >
        <div className="ob-consent-title">
          <Users aria-hidden="true" />
          <div>
            <span className="ob-badge">Optional permission</span>
            <h2 id="community-consent-heading">Community health insights</h2>
          </div>
        </div>
        <p>
          Eligible information is privacy-protected before population-level use
          and aggregated with other reports. Authorized Public Health Officers
          monitor those aggregated patterns, not your private health timeline.
        </p>
        <label className="ob-choice">
          <input
            id="communityContribution"
            type="checkbox"
            checked={contribution}
            onChange={(e) =>
              onChange({
                ...value,
                communityContribution: {
                  ...value.communityContribution,
                  decision: e.target.checked ? "granted" : "declined",
                },
              })
            }
            aria-describedby="community-choice-help"
          />
          <span>
            Contribute my eligible health signals to community health insights.
          </span>
        </label>
        <p className="ob-choice-state">
          Your choice:{" "}
          <strong>
            {contribution
              ? "Contribution requested (pending activation)"
              : "Contribution off"}
          </strong>
        </p>
        <p id="community-choice-help">
          This is entirely optional. Leaving it off does not prevent you from
          using your personal health tracker.
        </p>
      </section>
      <div className="ob-consent-footer">
        <ShieldCheck aria-hidden="true" />
        <p>
          These are your initial choices. You can review them later in Settings.
          You will not be asked for the same consent with every report; a
          materially new purpose or policy change may require a fresh choice.
        </p>
      </div>
      <p className="ob-hint">
        Your preference is saved when you finish setup. Community contribution
        remains off until approved policy and consent integration are available.
      </p>
    </div>
  );
}
