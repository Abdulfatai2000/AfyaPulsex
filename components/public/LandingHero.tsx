import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  HeartHandshake,
  MapPin,
} from "lucide-react";
import { HealthSignalVisual } from "./HealthSignalVisual";
export function LandingHero() {
  return (
    <section className="ap-hero" aria-labelledby="hero-title">
      <div className="ap-container">
        <div className="ap-hero-grid">
          <div className="ap-hero-copy">
            <p className="ap-eyebrow">
              <span className="ap-eyebrow-dot" /> YOUR HEALTH. OUR COLLECTIVE
              STRENGTH.
            </p>
            <h1 id="hero-title">
              Turn Small Health Signals Into <span>Early Warnings.</span>
            </h1>
            <p className="ap-hero-description">
              Track your health. Protect your loved ones.
              <br className="hidden sm:block" /> Help build healthier
              communities.
            </p>
            <p className="ap-hero-context">
              A personal health companion with a bigger purpose. Built with the
              everyday health of Nigerian communities in mind.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth?mode=signup"
                className="ap-button ap-button-primary"
              >
                Get Started <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="ap-button ap-button-secondary"
              >
                Learn More <ArrowDown aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <p className="ap-hero-note">
              <ShieldCheck aria-hidden="true" className="size-4" /> Your health
              story belongs to you.
            </p>
          </div>
          <HealthSignalVisual />
        </div>
        <div className="ap-trust-strip">
          {[
            {
              Icon: ShieldCheck,
              title: "Private by design",
              text: "Your records, your control",
            },
            {
              Icon: HeartHandshake,
              title: "Personal and purposeful",
              text: "Care for yourself and your community",
            },
            {
              Icon: MapPin,
              title: "Rooted in our communities",
              text: "From neighbourhoods to public health",
            },
          ].map(({ Icon, title, text }) => (
            <div key={title}>
              <Icon aria-hidden="true" />
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
