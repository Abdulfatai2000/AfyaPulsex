import {
  Activity,
  ShieldCheck,
  Users,
  BellRing,
  Stethoscope,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";
const steps = [
  {
    Icon: Activity,
    title: "Report Health Signal",
    text: "Notice something? Record how you feel.",
  },
  {
    Icon: ShieldCheck,
    title: "Privacy Protection",
    text: "Choose whether eligible signals may contribute.",
  },
  {
    Icon: Users,
    title: "Community Pattern",
    text: "Privacy-protected signals form aggregated insights.",
  },
  {
    Icon: BellRing,
    title: "Early Warning",
    text: "Unusual patterns can draw attention sooner.",
  },
  {
    Icon: Stethoscope,
    title: "Professional Review",
    text: "Authorized officers review the patterns.",
  },
  {
    Icon: HeartHandshake,
    title: "Healthier Community",
    text: "Better information supports a coordinated response.",
  },
];
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="ap-section bg-white"
      aria-labelledby="how-title"
    >
      <div className="ap-container">
        <div className="ap-section-heading text-center">
          <p className="ap-eyebrow">SMALL ACTIONS. MEANINGFUL CONNECTIONS.</p>
          <h2 id="how-title">
            From a personal signal
            <br className="hidden sm:block" /> to a community insight.
          </h2>
          <p>
            Your everyday observations can be part of something bigger, with
            privacy at every step.
          </p>
        </div>
        <ol className="ap-steps">
          {steps.map(({ Icon, title, text }, i) => (
            <li key={title} className="ap-step">
              <div className="ap-step-top">
                <span className="ap-step-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="ap-step-number">0{i + 1}</span>
                {i < steps.length - 1 && (
                  <ArrowRight aria-hidden="true" className="ap-step-arrow" />
                )}
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
