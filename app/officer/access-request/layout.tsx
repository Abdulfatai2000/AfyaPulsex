import { AppLogo } from "@/components/shared/AppLogo";
import Link from "next/link";
import styles from "@/components/officer/access-request/AccessRequest.module.css";

export default function AccessRequestLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="ap-public min-h-screen">
      <a href="#main-content" className="ap-skip-link">
        Skip to content
      </a>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <AppLogo />
          <Link href="/auth?entry=officer">Officer sign in <span aria-hidden="true">→</span></Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
