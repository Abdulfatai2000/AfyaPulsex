import { getPersonalHealthInsight } from "@/server/services/personal-health-insights";
import styles from "./PersonalHealthInsights.module.css";

export async function PersonalHealthInsights() {
  const insight = await getPersonalHealthInsight();
  return (
    <section className={styles.section} aria-labelledby="personal-insights-title">
      <h2 id="personal-insights-title">Your Personal Health Insights</h2>
      <p className="al-muted">Private insights from your reports, separate from official public health alerts.</p>
      {insight ? <article className={styles.card}>
        <div className={styles.heading}>
          <h3>Pattern noticed</h3>
          <span className={styles.badge}>{insight.source === "ai" ? "AI-generated" : "Report-based fallback · AI unavailable"}</span>
        </div>
        <p>{insight.observation}</p>
        <p><strong>Next step:</strong> {insight.guidance}</p>
        <p className="al-muted">Based on your latest {insight.reportCount} {insight.reportCount === 1 ? "report" : "reports"}
          {insight.latestReportDate && <> · Latest report: <time dateTime={insight.latestReportDate}>{new Date(insight.latestReportDate).toLocaleDateString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" })}</time></>}.
        </p>
        <p className={styles.disclaimer}>This is general health information, not a diagnosis.</p>
      </article> : <p className={styles.card}>Your personal insights will appear here after your first health report.</p>}
    </section>
  );
}
