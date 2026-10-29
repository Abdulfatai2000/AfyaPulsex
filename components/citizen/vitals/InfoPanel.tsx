import {
  Check,
  ClipboardPlus,
  ShieldCheck,
  Lightbulb,
  UsersRound,
} from "lucide-react";
export function InfoPanel() {
  return (
    <aside className="vt-info" aria-label="About manual vitals">
      <section className="vt-card vt-blue">
        <ClipboardPlus size={64} aria-hidden="true" />
        <h2>Keep track of your health</h2>
        <p>
          Record your latest vital signs to monitor your health over time. You
          can quickly enter the most recent measurement from your device.
        </p>
        <p>AfyaPulse does not measure or connect to your device.</p>
      </section>
      <section className="vt-card vt-tips">
        <Lightbulb aria-hidden="true" />
        <h2>Tips for accurate readings</h2>
        <ul>
          {[
            "Use a reliable home device",
            "Rest for a few minutes before measuring",
            "Measure at the same time if possible",
            "Record only your latest reading",
            "Add an optional note (e.g. after exercise)",
          ].map((tip) => (
            <li key={tip}>
              <Check size={16} aria-hidden="true" />
              {tip}
            </li>
          ))}
        </ul>
      </section>
      <section className="vt-card vt-routine">
        <UsersRound aria-hidden="true" />
        <h2>For both urgent and routine tracking</h2>
        <p>
          Record measurements when feeling unwell or as part of your regular
          health tracking.
        </p>
      </section>
      <section className="vt-card vt-safety">
        <ShieldCheck aria-hidden="true" />
        <h2>This is not a diagnosis</h2>
        <p>
          AfyaPulse records health information. It does not provide medical
          diagnosis or treatment advice.
        </p>
      </section>
    </aside>
  );
}
