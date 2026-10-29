import type { Metadata } from "next";
import { LandingHero } from "@/components/public/LandingHero";
import { HowItWorks } from "@/components/public/HowItWorks";
import {
  ProblemSection,
  PersonalFeatures,
  PrivacySection,
  PublicHealthImpact,
  FinalCallToAction,
} from "@/components/public/LandingSections";
export const metadata: Metadata = {
  title: "AfyaPulse | Personal health. Community strength.",
  description:
    "Track your health, protect your loved ones, and help build healthier communities through optional, privacy-protected health signals.",
};
export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <ProblemSection />
      <HowItWorks />
      <PersonalFeatures />
      <PrivacySection />
      <PublicHealthImpact />
      <FinalCallToAction />
    </>
  );
}
