import { ChartNoAxesCombined, Plus } from "lucide-react";
export function ProgressCard({
  onRecord,
  empty,
}: {
  onRecord: () => void;
  empty: boolean;
}) {
  return (
    <section className="vt-card vt-progress">
      <ChartNoAxesCombined aria-hidden="true" size={36} />
      <h2>See your progress over time</h2>
      <p>Your vital readings will appear here as you record them.</p>
      <button className="vt-primary" onClick={onRecord}>
        <Plus size={18} aria-hidden="true" />
        {empty ? "Record your first vital" : "Record a vital"}
      </button>
    </section>
  );
}
