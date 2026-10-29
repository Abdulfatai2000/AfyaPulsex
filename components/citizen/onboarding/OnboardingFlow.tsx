"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  UserRound,
  MapPin,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import type {
  OnboardingDraft,
  OnboardingErrors,
  OnboardingStep,
} from "@/types/onboarding";
import { PendingButton } from "../feedback/CitizenLoading";
import {
  saveOnboardingStepAction,
  submitOnboardingAction,
} from "@/server/actions/citizen/onboarding";
import { OnboardingStepper } from "./OnboardingStepper";
import { PersonalStep } from "./PersonalStep";
import { LocationStep } from "./LocationStep";
import { HealthProfileStep } from "./HealthProfileStep";
import { ConsentStep } from "./ConsentStep";
import { CompleteStep } from "./CompleteStep";
import {
  personalInformationSchema,
  locationSchema,
  privacySchema,
} from "./validation";

function initialDraft(): OnboardingDraft {
  return {
    personal: { fullName: "", dateOfBirth: "", gender: "" },
    location: { country: "Nigeria", state: "", district: "", community: "" },
    healthProfile: {
      bloodGroup: "",
      allergiesText: "",
      conditionsText: "",
      medicationsText: "",
    },
    healthProfileSkipped: false,
    privacy: {
      personalTrackingAcknowledged: false,
      communityContribution: {
        purpose: "community_insights",
        decision: "declined",
        policyVersion: null,
        recordedAt: null,
      },
    },
  };
}
const content = [
  {
    title: "Tell us about yourself",
    description:
      "A few details help personalize your health experience. Your full name and date of birth are required.",
    Icon: UserRound,
    asideTitle: "Your health journey starts here.",
    asideText:
      "A little context helps make your personal health record more useful to you.",
  },
  {
    title: "Where are you located?",
    description:
      "Your broad area helps AfyaPulse understand health patterns across communities. Please use approximate area names only.",
    Icon: MapPin,
    asideTitle: "Stronger communities.",
    asideText:
      "Country, state and district give useful context without needing your exact home location.",
  },
  {
    title: "Build your health profile",
    description:
      "Optional: add context to your personal health history. You can continue without completing any of these fields.",
    Icon: HeartPulse,
    asideTitle: "Better care starts with context.",
    asideText:
      "Only add information you want to keep in your personal history. This step is entirely optional.",
  },
  {
    title: "Your health data. Your choice.",
    description:
      "Understand personal tracking, then choose whether you want to contribute to community health insights.",
    Icon: ShieldCheck,
    asideTitle: "Privacy comes first.",
    asideText:
      "Your personal health timeline is private. Choosing not to contribute does not take away your personal tracker.",
  },
  {
    title: "You're ready to use AfyaPulse",
    description: "A small step toward a clearer picture of your health.",
    Icon: ShieldCheck,
    asideTitle: "",
    asideText: "",
  },
] as const;

export function OnboardingFlow({
  savedDraft,
  savedStep = 0,
  accountName = "",
}: {
  savedDraft?: OnboardingDraft;
  savedStep?: 0 | 1 | 2 | 3;
  accountName?: string;
}) {
  const [step, setStep] = useState<OnboardingStep>(savedStep);
  const [draft, setDraft] = useState<OnboardingDraft>(
    () =>
      savedDraft ?? {
        ...initialDraft(),
        personal: { ...initialDraft().personal, fullName: accountName },
      },
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const busy = useRef(false);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  // Focus follows the new step, including Back, so keyboard/screen-reader users
  // encounter its heading instead of remaining on a replaced Continue button.
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (Object.keys(errors).length)
      form.current
        ?.querySelector<HTMLInputElement>('[aria-invalid="true"]')
        ?.focus();
  }, [errors]);
  function back() {
    if (busy.current) return;
    setSaveError("");
    setErrors({});
    setStep((current) => Math.max(0, current - 1) as OnboardingStep);
  }
  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const result =
      step === 0
        ? personalInformationSchema.safeParse(draft.personal)
        : step === 1
          ? locationSchema.safeParse(draft.location)
          : step === 3
            ? privacySchema.safeParse(draft.privacy)
            : null;
    if (result && !result.success) {
      const nextErrors: OnboardingErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof OnboardingErrors;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    void persist(
      step === 2 ? { ...draft, healthProfileSkipped: false } : draft,
    );
  }
  async function persist(nextDraft: OnboardingDraft) {
    if (busy.current || step > 3) return;
    busy.current = true;
    setSaving(true);
    setSaveError("");
    try {
      if (step === 3) await submitOnboardingAction(nextDraft);
      else await saveOnboardingStepAction(nextDraft, step);
      setDraft(nextDraft);
      setStep((step + 1) as OnboardingStep);
    } catch {
      setSaveError(
        "We could not save this step. Your entries are still here. Please try again.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const current = content[step];
  const Icon = current.Icon;
  return (
    <section className="ap-onboarding" aria-labelledby="onboarding-heading">
      <div className="ob-topline">
        <span>LET&apos;S GET TO KNOW YOU</span>
        <span id="onboarding-current">Step {step + 1} of 5</span>
      </div>
      <OnboardingStepper step={step} />
      <div className={step === 4 ? "ob-card ob-completion-card" : "ob-card"}>
        <div className="ob-card-main">
          <header className="ob-heading">
            <h1
              id="onboarding-heading"
              ref={heading}
              tabIndex={-1}
              aria-describedby="onboarding-current"
            >
              {current.title}
            </h1>
            <p>{current.description}</p>
          </header>
          {step === 4 ? (
            <CompleteStep draft={draft} onBack={back} />
          ) : (
            <form
              ref={form}
              onSubmit={next}
              noValidate
              aria-label={current.title}
            >
              <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
                {step === 0 && (
                  <PersonalStep
                    value={draft.personal}
                    errors={errors}
                    onChange={(personal) =>
                      setDraft((previous) => ({ ...previous, personal }))
                    }
                  />
                )}
                {step === 1 && (
                  <LocationStep
                    value={draft.location}
                    errors={errors}
                    onChange={(location) =>
                      setDraft((previous) => ({ ...previous, location }))
                    }
                  />
                )}
                {step === 2 && (
                  <HealthProfileStep
                    value={draft.healthProfile}
                    onChange={(healthProfile) =>
                      setDraft((previous) => ({ ...previous, healthProfile }))
                    }
                  />
                )}
                {step === 3 && (
                  <ConsentStep
                    value={draft.privacy}
                    errors={errors}
                    onChange={(privacy) =>
                      setDraft((previous) => ({ ...previous, privacy }))
                    }
                  />
                )}
              </fieldset>
              {saveError && (
                <p role="alert" className="ob-error">
                  {saveError}
                </p>
              )}
              <div className="ob-actions">
                {step > 0 && (
                  <button
                    type="button"
                    className="ob-back"
                    disabled={saving}
                    onClick={back}
                  >
                    <ArrowLeft aria-hidden="true" />
                    Back
                  </button>
                )}
                {step === 2 && (
                  <button
                    type="button"
                    className="ob-skip"
                    disabled={saving}
                    onClick={() =>
                      void persist({ ...draft, healthProfileSkipped: true })
                    }
                  >
                    Skip for now
                  </button>
                )}
                <PendingButton
                  type="submit"
                  className="ob-next"
                  pending={saving}
                  pendingLabel="Saving..."
                >
                  {step === 3 ? "Finish setup" : "Continue"}
                  <ArrowRight aria-hidden="true" />
                </PendingButton>
              </div>
            </form>
          )}
        </div>
        {step !== 4 && (
          <aside className="ob-side-panel">
            <div className={"ob-illustration ob-illustration-" + step}>
              <Icon aria-hidden="true" />
            </div>
            <h2>{current.asideTitle}</h2>
            <p>{current.asideText}</p>
            <span className="ob-side-mark">
              <ShieldCheck aria-hidden="true" />
              Personal health. Your control.
            </span>
          </aside>
        )}
      </div>
      {step !== 4 && (
        <p className="ob-session-note">
          Each completed step is saved to your account. You can return later to
          finish setup.
        </p>
      )}
    </section>
  );
}
