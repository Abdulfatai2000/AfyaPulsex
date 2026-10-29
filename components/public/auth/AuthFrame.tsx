import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, HeartPulse, Users } from "lucide-react";
import { AppLogo } from "@/components/shared/AppLogo";
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="ap-auth">
      <a href="#auth-content" className="ap-skip-link">
        Skip to account access
      </a>
      <div className="ap-container ap-auth-top">
        <AppLogo />
        <Link href="/" className="ap-back-link">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to landing page
        </Link>
      </div>
      <main
        id="auth-content"
        tabIndex={-1}
        className="ap-container ap-auth-grid"
      >
        <aside className="ap-auth-story">
          <p className="ap-eyebrow">YOUR HEALTH. YOUR STORY.</p>
          <h2>
            A little more awareness.
            <br />
            <span>A healthier tomorrow.</span>
          </h2>
          <p>
            One place to understand your health, and a thoughtful way to help
            care for your community.
          </p>
          <div className="ap-auth-emblem" aria-hidden="true">
            <HeartPulse />
          </div>
          <ul>
            <li>
              <ShieldCheck aria-hidden="true" />
              <span>Your personal health record stays private.</span>
            </li>
            <li>
              <Users aria-hidden="true" />
              <span>Optional contribution. Collective understanding.</span>
            </li>
          </ul>
        </aside>
        <div className="ap-auth-card">{children}</div>
      </main>
      <footer className="ap-auth-footer">
        <ShieldCheck aria-hidden="true" className="size-4" />
        <span>Personal health. Community strength.</span>
      </footer>
    </div>
  );
}
