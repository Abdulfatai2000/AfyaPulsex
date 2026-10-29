import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/citizen/onboarding/OnboardingFlow";
import "./onboarding.css";
import { getCitizenOnboarding } from "@/server/services/citizen-onboarding";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Set up your profile | AfyaPulse" };
export default async function OnboardingPage() {
  const state = await getCitizenOnboarding();
  if (state.complete) redirect("/dashboard");
  return (
    <OnboardingFlow
      savedDraft={state.draft}
      savedStep={state.step as 0 | 1 | 2 | 3}
      accountName={state.name}
    />
  );
}
