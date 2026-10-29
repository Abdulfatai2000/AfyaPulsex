import { ShieldCheck } from "lucide-react";
import styles from "@/components/officer/access-request/AccessRequest.module.css";
import { AccessRequestForm } from "@/components/officer/access-request/AccessRequestForm";

export default function AccessRequestPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>AFYAPULSE / PUBLIC HEALTH PROFESSIONALS</p>
        <h1>Request Public Health Access</h1>
        <p>A dedicated workspace for the people protecting our communities.</p>
        <span className={styles.heroBadge}><ShieldCheck size={16} aria-hidden="true" /> Authority-reviewed access</span>
      </header>
      <div className={styles.composition}>
        <AccessRequestForm />
      </div>
    </div>
  );
}
