import Link from "next/link";
import {
  Activity,
  HeartPulse,
  History,
  BellRing,
  LockKeyhole,
  SlidersHorizontal,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Users,
  ScanLine,
  Stethoscope,
} from "lucide-react";
export function ProblemSection() {
  return (
    <section className="ap-section" aria-labelledby="problem-title">
      <div className="ap-container ap-two-column">
        <div className="ap-section-heading">
          <p className="ap-eyebrow">THE BIGGER PICTURE</p>
          <h2 id="problem-title">
            Health changes rarely
            <br className="hidden sm:block" /> happen all at once.
          </h2>
        </div>
        <div className="ap-problem-copy">
          <p>
            A persistent cough. An unusual fever. A change in how you feel.
            Individually, these can seem small. Across a community, they may
            tell a larger story.
          </p>
          <p>
            AfyaPulse is designed to help people keep track of their own health
            and help public health teams notice emerging patterns earlier.
          </p>
          <div className="ap-inline-note">
            <Activity aria-hidden="true" />
            <span>Better awareness starts with the signals we notice.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
const features = [
  {
    Icon: Activity,
    title: "Make sense of how you feel",
    text: "Record symptoms and everyday health changes in one place.",
    tag: "HEALTH SIGNALS",
  },
  {
    Icon: HeartPulse,
    title: "Keep your vital readings close",
    text: "Build a record of measurements you enter, ready for your own reference.",
    tag: "MANUAL VITALS",
  },
  {
    Icon: History,
    title: "See your health over time",
    text: "Bring your personal timeline, trends, and insights together.",
    tag: "MY HEALTH",
  },
  {
    Icon: BellRing,
    title: "Stay aware of your surroundings",
    text: "Find relevant public health alerts and community guidance.",
    tag: "HEALTH ALERTS",
  },
];
export function PersonalFeatures() {
  return (
    <section
      id="features"
      className="ap-section"
      aria-labelledby="features-title"
    >
      <div className="ap-container">
        <div className="ap-section-heading">
          <p className="ap-eyebrow">START WITH YOU</p>
          <h2 id="features-title">
            Your everyday health,
            <br className="hidden sm:block" /> a little more connected.
          </h2>
          <p>
            A thoughtful space for the health details that matter to you. These
            features are being built for the Citizen App.
          </p>
        </div>
        <div className="ap-feature-grid">
          {features.map(({ Icon, title, text, tag }) => (
            <article className="ap-feature-card" key={tag}>
              <div className="ap-feature-top">
                <span className="ap-feature-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>{tag}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function PrivacySection() {
  return (
    <section
      id="privacy"
      className="ap-section bg-white"
      aria-labelledby="privacy-title"
    >
      <div className="ap-container">
        <div className="ap-privacy-panel">
          <div>
            <p className="ap-eyebrow">YOUR TRUST COMES FIRST</p>
            <h2 id="privacy-title">
              Your health is personal.
              <br />
              <span>It should stay that way.</span>
            </h2>
            <p>
              Community health should never come at the expense of your privacy.
              AfyaPulse puts a clear boundary between your personal records and
              public health insights.
            </p>
            <div className="ap-privacy-seal">
              <ShieldCheck aria-hidden="true" />
              <span>
                Private records.
                <br />
                <strong>Purposeful contribution.</strong>
              </span>
            </div>
          </div>
          <ul className="ap-privacy-list">
            {[
              {
                Icon: LockKeyhole,
                title: "Your private health timeline",
                text: "Your personal health records remain private. Authorized Public Health Officers monitor aggregated patterns, not your private timeline.",
              },
              {
                Icon: SlidersHorizontal,
                title: "Contribution is your choice",
                text: "You control optional community contribution. Using your personal health record does not mean sharing it with your community.",
              },
              {
                Icon: ShieldCheck,
                title: "Insights with privacy protection",
                text: "Eligible signals may contribute to privacy-protected aggregated insights, subject to consent and privacy rules.",
              },
            ].map(({ Icon, title, text }) => (
              <li key={title}>
                <Icon aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
export function PublicHealthImpact() {
  return (
    <section
      id="community"
      className="ap-section"
      aria-labelledby="impact-title"
    >
      <div className="ap-container ap-two-column">
        <div className="ap-impact-visual" aria-hidden="true">
          <div className="ap-impact-circle">
            <Users />
          </div>
          <span>People</span>
          <i />
          <div className="ap-impact-circle">
            <ScanLine />
          </div>
          <span>Patterns</span>
          <i />
          <div className="ap-impact-circle">
            <Stethoscope />
          </div>
          <span>Professional review</span>
        </div>
        <div className="ap-section-heading">
          <p className="ap-eyebrow">PERSONAL CARE. PUBLIC GOOD.</p>
          <h2 id="impact-title">
            Healthier neighbourhoods.
            <br />
            Better-informed response.
          </h2>
          <p>
            From a street in Lagos to communities across Nigeria, timely
            information can help public health teams understand where attention
            is needed.
          </p>
          <p>
            AfyaPulse supports awareness and professional review. It does not
            diagnose disease or replace care from a qualified health
            professional.
          </p>
          <Link href="/officer/access-request" className="ap-impact-link">
            Working in public health? Request access{" "}
            <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
          </Link>
        </div>
      </div>
    </section>
  );
}
export function FinalCallToAction() {
  return (
    <section
      className="ap-container ap-final-wrap"
      aria-labelledby="start-title"
    >
      <div className="ap-final-cta">
        <div>
          <p className="ap-eyebrow">
            A SMALL STEP FOR YOU. A BIGGER PICTURE FOR ALL.
          </p>
          <h2 id="start-title">
            Your next chapter of
            <br className="hidden sm:block" /> health awareness starts here.
          </h2>
          <p>For you. For the people you love. For the place you call home.</p>
        </div>
        <Link href="/auth?mode=signup" className="ap-button ap-button-light">
          Get Started <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
