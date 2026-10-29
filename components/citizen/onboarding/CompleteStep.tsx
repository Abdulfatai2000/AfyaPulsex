import Link from "next/link";
import { CircleCheck, ArrowRight, ShieldCheck } from "lucide-react";
import type { OnboardingDraft } from "@/types/onboarding";
export function CompleteStep({
  draft,
  onBack,
}: {
  draft: OnboardingDraft;
  onBack: () => void;
}) {
  return (
    <div className="ob-complete">
      <div className="ob-success-icon">
        <CircleCheck aria-hidden="true" />
      </div>
      <p className="ob-complete-lead">Your profile setup has been saved.</p>
      <p>
        You can head to your dashboard and begin exploring AfyaPulse. Your
        privacy choices can later be reviewed in Profile &amp; Settings.
      </p>
      <ul className="ob-complete-summary">
        <li>
          <CircleCheck aria-hidden="true" />
          Personal details and broad location ready
        </li>
        <li>
          <CircleCheck aria-hidden="true" />
          {draft.healthProfileSkipped
            ? "Optional health profile skipped for now"
            : "Optional health profile step reviewed"}
        </li>
        <li>
          <ShieldCheck aria-hidden="true" />
          Community contribution:{" "}
          <strong>
            {draft.privacy.communityContribution.decision === "granted"
              ? "requested (pending activation)"
              : "off"}
          </strong>
        </li>
      </ul>
      <p className="ob-preview-notice">
        Your details and privacy preference are saved. Community contribution
        remains off until the approved policy and consent service are available.
      </p>
      <Link href="/dashboard" className="ap-button ap-button-primary">
        Go to Dashboard <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
      <button type="button" className="ob-review-button" onClick={onBack}>
        Back to privacy choices
      </button>
    </div>
  );
}
