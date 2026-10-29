import { Check } from "lucide-react";
import type { OnboardingStep } from "@/types/onboarding";
export const onboardingSteps = [
  "Personal",
  "Location",
  "Health Profile",
  "Privacy",
  "Complete",
] as const;
export function OnboardingStepper({ step }: { step: OnboardingStep }) {
  return (
    <nav aria-label="Onboarding progress" className="ob-stepper">
      <ol>
        {onboardingSteps.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            data-complete={index < step || undefined}
          >
            <span className="ob-step-circle" aria-hidden="true">
              {index < step ? <Check /> : index + 1}
            </span>
            <span className="ob-step-label">{label}</span>
            <span className="sr-only">
              {index < step
                ? " completed"
                : index === step
                  ? " current step"
                  : " upcoming"}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
