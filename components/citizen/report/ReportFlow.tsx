"use client";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  FileText,
  MapPin,
  Edit,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  Users,
  Info,
  HeartPulse,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import type { ReportDraft, ReportStep } from "@/types/report";
import { initialDraft, REPORT_STEP_LABELS, hasBodyAreaRelevant } from "@/types/report";
import { SymptomSelection } from "./SymptomSelection";
import { BodyAreaStep } from "./BodyAreaStep";
import { DetailsStep } from "./DetailsStep";
import bodyMapStyles from "./BodyMap.module.css";
import { submitReportAction } from "@/server/actions/citizen/report";

const STEP_CONFIG = [
  { title: "What are you experiencing?", description: "Select all symptoms that apply to your current health situation.", Icon: Stethoscope, asideTitle: "Start with symptoms.", asideText: "Your selections guide the next steps." },
  { title: "Where is the discomfort?", description: "Select one or more areas on the body (tap/click).", Icon: MapPin, asideTitle: "Location matters.", asideText: "Specific areas help identify patterns." },
  { title: "Add details", description: "Provide context about timing, triggers, and severity.", Icon: FileText, asideTitle: "Context helps.", asideText: "Optional details improve care quality." },
  { title: "Review & Submit", description: "Confirm your report before submitting.", Icon: ShieldCheck, asideTitle: "Almost done.", asideText: "Review and submit your health signal." },
] as const;

type SubmissionState = "ready" | "submitting" | "success" | "error";

function getStepSequence(hasBodyArea: boolean): ReportStep[] {
  if (hasBodyArea) {
    return [0, 1, 2, 3];
  }
  return [0, 2, 3];
}

function getStepIndex(sequence: ReportStep[], currentStep: ReportStep): number {
  return sequence.indexOf(currentStep);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function getDurationLabel(value: string): string {
  const labels: Record<string, string> = {
    "<1h": "Less than 1 hour",
    "1-6h": "1–6 hours",
    "6-24h": "6–24 hours",
    "1-3d": "1–3 days",
    "4-7d": "4–7 days",
    "1w+": "More than 1 week",
  };
  return labels[value] || value;
}

function getSeverityLabel(severity: number): string {
  return severity <= 3 ? "Mild" : severity <= 6 ? "Moderate" : "Severe";
}

function getSeverityClass(severity: number): string {
  return severity <= 3 ? "mild" : severity <= 6 ? "moderate" : "severe";
}

export function ReportFlow() {
  const router = useRouter();
  const [step, setStep] = useState<ReportStep>(0);
  const [draft, setDraft] = useState<ReportDraft>(initialDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof ReportDraft, string>>>({});
  const [submissionState, setSubmissionState] = useState<SubmissionState>("ready");
  const [submitError, setSubmitError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const hasBodyArea = hasBodyAreaRelevant(draft.symptoms);
  const stepSequence = getStepSequence(hasBodyArea);
  const currentStepIndex = getStepIndex(stepSequence, step);
  const currentConfig = STEP_CONFIG[step];
  const Icon = currentConfig.Icon;

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (Object.keys(errors).length) {
      form.current
        ?.querySelector<HTMLInputElement>('[aria-invalid="true"]')
        ?.focus();
    }
  }, [errors]);

  const validateStep = (stepToValidate: ReportStep): boolean => {
    const newErrors: Partial<Record<keyof ReportDraft, string>> = {};

    if (stepToValidate === 0) {
      if (draft.symptoms.length === 0) {
        newErrors.symptoms = "Select at least one symptom to continue";
      }
    }

    if (stepToValidate === 1) {
      if (!draft.bodyArea.trim()) {
        newErrors.bodyArea = "Please specify a body area to continue";
      }
    }

    if (stepToValidate === 2) {
      if (!draft.severity) {
        newErrors.severity = "Select a severity level";
      }
      if (!draft.startDate) {
        newErrors.startDate = "Select a start date";
      } else if (draft.startDate > new Date().toISOString().split("T")[0]) {
        newErrors.startDate = "Start date cannot be in the future";
      }
      if (!draft.startTime) {
        newErrors.startTime = "Select a start time";
      } else if (
        draft.startDate === new Date().toISOString().split("T")[0] &&
        draft.startTime > new Date().toTimeString().slice(0, 5)
      ) {
        newErrors.startTime = "Start time cannot be in the future";
      }
      if (!draft.duration) {
        newErrors.duration = "Select a duration";
      }
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const back = () => {
    setErrors({});
    setSubmissionState("ready");
    setSubmitError("");
    const currentIndex = stepSequence.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepSequence[currentIndex - 1]);
    }
  };

  const goToStep = (targetStep: ReportStep) => {
    setErrors({});
    setSubmissionState("ready");
    setSubmitError("");
    const targetIndex = stepSequence.indexOf(targetStep);
    if (targetIndex >= 0) {
      setStep(targetStep);
    }
  };

  const next = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateStep(step)) return;

    const currentIndex = stepSequence.indexOf(step);
    if (currentIndex < stepSequence.length - 1) {
      setStep(stepSequence[currentIndex + 1]);
    } else if (step === 3) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (submissionState !== "ready") return;
    setSubmissionState("submitting");
    setSubmitError("");

    try {
      const result = await submitReportAction(draft);
      if (result.ok) {
        setSubmissionState("success");
      } else {
        setSubmissionState("error");
        setSubmitError("We couldn't record your health signal. Please try again.");
      }
    } catch {
      setSubmissionState("error");
      setSubmitError("We couldn't record your health signal. Please try again.");
    }
  };

  const handleRetry = () => {
    handleSubmit();
  };

  const updateSymptoms = (value: Pick<ReportDraft, "symptoms" | "customSymptom">) => {
    setDraft((prev) => ({ ...prev, ...value }));
  };

  const updateBodyArea = (value: Pick<ReportDraft, "bodyArea">) => {
    setDraft((prev) => ({ ...prev, ...value }));
  };

  const updateDetails = (value: Pick<ReportDraft, "details" | "severity" | "startDate" | "startTime" | "duration" | "notes">) => {
    setDraft((prev) => ({ ...prev, ...value }));
  };

  const isFirstStep = step === stepSequence[0];

  return (
    <section className="rp-report-flow" aria-labelledby="report-heading">
      <div className="rp-topline">
        <span>REPORT HEALTH SIGNAL</span>
        <span id="report-current">
          Step {currentStepIndex + 1} of {stepSequence.length}
        </span>
      </div>

      <div className="rp-stepper" role="navigation" aria-label="Report progress">
        {stepSequence.map((s, idx) => (
          <button
            key={s}
            type="button"
            className={cn(
              "rp-step",
              idx < currentStepIndex && "rp-step--complete",
              idx === currentStepIndex && "rp-step--current",
              idx > currentStepIndex && "rp-step--pending"
            )}
            aria-current={idx === currentStepIndex ? "step" : undefined}
            disabled
          >
            <span className="rp-step-number">{idx + 1}</span>
            <span className="rp-step-label">{REPORT_STEP_LABELS[s]}</span>
          </button>
        ))}
      </div>

      <div className={cn("rp-card", step === 3 && "rp-card--review", step === 1 && bodyMapStyles.reportCard)}>
        <div className="rp-card-main">
          <header className="rp-heading">
            <h1
              id="report-heading"
              ref={heading}
              tabIndex={-1}
              aria-describedby="report-current"
            >
              {currentConfig.title}
            </h1>
            <p>{currentConfig.description}</p>
          </header>

          {step === 3 ? (
            <ReportReview
              draft={draft}
              onBack={back}
              onEdit={goToStep}
              onSubmit={handleSubmit}
              onRetry={handleRetry}
              submissionState={submissionState}
              submitError={submitError}
              router={router}
            />
          ) : (
            <form ref={form} onSubmit={next} noValidate aria-label={currentConfig.title}>
              {step === 0 && (
                <SymptomSelection
                  value={{ symptoms: draft.symptoms, customSymptom: draft.customSymptom }}
                  onChange={updateSymptoms}
                  error={errors.symptoms}
                />
              )}
              {step === 1 && (
                <BodyAreaStep
                  value={{ bodyArea: draft.bodyArea, symptoms: draft.symptoms }}
                  onChange={updateBodyArea}
                  onBack={back}
                  onNext={() => form.current?.requestSubmit()}
                />
              )}
              {step === 2 && (
                <DetailsStep
                  value={{
                    details: draft.details,
                    severity: draft.severity,
                    startDate: draft.startDate,
                    startTime: draft.startTime,
                    duration: draft.duration,
                    notes: draft.notes,
                  }}
                  onChange={updateDetails}
                  onBack={back}
                  onNext={() => form.current?.requestSubmit()}
                  symptoms={draft.symptoms}
                  bodyArea={draft.bodyArea}
                />
              )}

              {isFirstStep && (
                <div className="rp-actions">
                  <Button type="submit" className="rp-next" disabled={submissionState === "submitting"}>
                    Continue
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </div>
              )}
            </form>
          )}
        </div>

        {step !== 3 && step !== 1 && (
          <aside className="rp-side-panel">
            <div className={cn("rp-illustration", `rp-illustration-${step}`)}>
              <Icon aria-hidden="true" />
            </div>
            <h2>{currentConfig.asideTitle}</h2>
            <p>{currentConfig.asideText}</p>
            <span className="rp-side-mark">
              <ShieldCheck aria-hidden="true" />
              Personal health. Your control.
            </span>
          </aside>
        )}
      </div>

      {step !== 3 && (
        <p className="rp-session-note">
          Your entries stay on this page. Refreshing or leaving clears this
          draft.
        </p>
      )}
    </section>
  );
}

function ReportReview({
  draft,
  onBack,
  onEdit,
  onSubmit,
  onRetry,
  submissionState,
  submitError,
  router,
}: {
  draft: ReportDraft;
  onBack: () => void;
  onEdit: (step: ReportStep) => void;
  onSubmit: () => void;
  onRetry: () => void;
  submissionState: SubmissionState;
  submitError: string;
  router: ReturnType<typeof useRouter>;
}) {
  const hasBodyArea = draft.bodyArea.trim().length > 0;

  return (
    <div className="rr-review">
      <div className="rr-content">
        <header className="rr-header">
          <h2 className="rr-title">Review your health signal</h2>
          <p className="rr-subtitle">Check the information below before submitting.</p>
        </header>

        <div className="rr-sections">
          <section className="rr-section" aria-labelledby="rr-symptoms-heading">
            <div className="rr-section-header">
              <h3 id="rr-symptoms-heading" className="rr-section-title">
                <span className="rr-section-icon" aria-hidden="true">🩺</span>
                Symptoms
              </h3>
              <button
                type="button"
                className="rr-edit-btn"
                onClick={() => onEdit(0)}
                aria-label="Edit symptoms"
              >
                <Edit className="rr-edit-icon" aria-hidden="true" />
                <span className="rr-edit-text">Edit</span>
              </button>
            </div>
            <div className="rr-chips" role="list">
              {draft.symptoms.length > 0 ? (
                draft.symptoms.map((s) => (
                  <span key={s} className="rr-chip" role="listitem">
                    {s}
                  </span>
                ))
              ) : (
                <span className="rr-empty">No symptoms selected</span>
              )}
            </div>
          </section>

          {hasBodyArea && (
            <section className="rr-section" aria-labelledby="rr-bodyarea-heading">
              <div className="rr-section-header">
                <h3 id="rr-bodyarea-heading" className="rr-section-title">
                  <span className="rr-section-icon" aria-hidden="true">📍</span>
                  Body Area
                </h3>
                <button
                  type="button"
                  className="rr-edit-btn"
                  onClick={() => onEdit(1)}
                  aria-label="Edit body area"
                >
                  <Edit className="rr-edit-icon" aria-hidden="true" />
                  <span className="rr-edit-text">Edit</span>
                </button>
              </div>
              <p className="rr-value">{draft.bodyArea}</p>
            </section>
          )}

          <section className="rr-section" aria-labelledby="rr-severity-heading">
            <div className="rr-section-header">
              <h3 id="rr-severity-heading" className="rr-section-title">
                <span className="rr-section-icon" aria-hidden="true">⚡</span>
                Severity
              </h3>
              <button
                type="button"
                className="rr-edit-btn"
                onClick={() => onEdit(2)}
                aria-label="Edit severity and timing"
              >
                <Edit className="rr-edit-icon" aria-hidden="true" />
                <span className="rr-edit-text">Edit</span>
              </button>
            </div>
            <div className="rr-grid">
              <div className="rr-grid-item">
                <span className="rr-grid-label">Level</span>
                <div className="rr-severity-display">
                  <span className={cn("rr-severity-badge", getSeverityClass(draft.severity || 0))}>
                    {draft.severity || "—"} / 10
                  </span>
                  <span className="rr-severity-text">{draft.severity ? `· ${getSeverityLabel(draft.severity)}` : ""}</span>
                </div>
              </div>
              <div className="rr-grid-item">
                <span className="rr-grid-label">Start</span>
                <div className="rr-value">{draft.startDate ? `${formatDate(draft.startDate)} at ${formatTime(draft.startTime)}` : "—"}</div>
              </div>
              <div className="rr-grid-item">
                <span className="rr-grid-label">Duration</span>
                <div className="rr-value">{draft.duration ? getDurationLabel(draft.duration) : "—"}</div>
              </div>
            </div>
          </section>

          <section className="rr-section" aria-labelledby="rr-notes-heading">
            <div className="rr-section-header">
              <h3 id="rr-notes-heading" className="rr-section-title">
                <span className="rr-section-icon" aria-hidden="true">📝</span>
                Notes
              </h3>
              <button
                type="button"
                className="rr-edit-btn"
                onClick={() => onEdit(2)}
                aria-label="Edit notes"
              >
                <Edit className="rr-edit-icon" aria-hidden="true" />
                <span className="rr-edit-text">Edit</span>
              </button>
            </div>
            <p className="rr-value">{draft.notes?.trim() || "No additional notes"}</p>
          </section>
        </div>

        {submissionState === "ready" && (
          <div className="rr-safety">
            <Info className="rr-safety-icon" aria-hidden="true" />
            <div>
              <strong>This is not a diagnosis</strong>
              <p>AfyaPulse records health signals for your personal timeline and community awareness. It does not provide medical diagnosis, treatment advice, or emergency assessment. For urgent concerns, contact a healthcare professional or emergency services.</p>
            </div>
          </div>
        )}

        {submissionState === "ready" && (
          <div className="rr-privacy">
            <Shield className="rr-privacy-icon" aria-hidden="true" />
            <div>
              <strong>Your health information is private</strong>
              <p>This report stays in your personal health record. Community contribution is controlled by your consent settings (managed separately).</p>
            </div>
          </div>
        )}

        {submissionState === "ready" && (
          <div className="rr-community">
            <Users className="rr-community-icon" aria-hidden="true" />
            <div>
              <strong>Community contribution</strong>
              <p>
                {/*
                  TODO(DEV3): load persisted consent state
                  TODO(DEV4): enforce current consent policy
                  Replace this logic with real consent state from Dev 3/Dev 4 integration.
                */}
                Community contribution disabled
              </p>
            </div>
          </div>
        )}

        <div className="rr-actions">
          {submissionState === "ready" && (
            <>
              <Button type="button" variant="outline" onClick={onBack} className="rr-back" disabled={submissionState !== "ready"}>
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
              <Button type="button" onClick={onSubmit} disabled={submissionState !== "ready"} className="rr-submit">
                Submit Health Signal
                <ArrowRight aria-hidden="true" />
              </Button>
            </>
          )}

          {submissionState === "submitting" && (
            <div className="rr-submitting">
              <Loader2 className="rr-spinner" aria-hidden="true" />
              <span>Submitting...</span>
            </div>
          )}

          {submissionState === "success" && (
            <div className="rr-success">
              <CheckCircle className="rr-success-icon" aria-hidden="true" />
              <div>
                <h3>Health signal recorded</h3>
                <p>Your health information has been added to your timeline.</p>
              </div>
              <div className="rr-success-actions">
                <Button type="button" variant="outline" onClick={() => router.push("/my-health")}>
                  <HeartPulse className="rr-action-icon" aria-hidden="true" />
                  View My Health
                </Button>
                <Button type="button" onClick={() => router.push("/dashboard")}>
                  <LayoutDashboard className="rr-action-icon" aria-hidden="true" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}

          {submissionState === "error" && (
            <div className="rr-error" role="alert">
              <AlertCircle className="rr-error-icon" aria-hidden="true" />
              <div>
                <h3>Submission failed</h3>
                <p>{submitError || "We couldn't record your health signal. Please try again."}</p>
                <p className="rr-error-note">Your draft has been preserved.</p>
              </div>
              <Button type="button" onClick={onRetry} className="rr-retry">
                <ArrowLeft className="rr-retry-icon" aria-hidden="true" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>

      <aside className="rr-side-panel" aria-hidden="true">
        <div className="rr-illustration rr-illustration-3">
          <ShieldCheck aria-hidden="true" />
        </div>
        <h2>Almost done.</h2>
        <p>Review and submit your health signal.</p>
        <span className="rp-side-mark">
          <ShieldCheck aria-hidden="true" />
          Personal health. Your control.
        </span>
      </aside>
    </div>
  );
}