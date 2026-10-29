import Link from "next/link";
import { AppLogo } from "@/components/shared/AppLogo";
export function PublicFooter() {
  return (
    <footer className="ap-footer">
      <div className="ap-container">
        <div className="ap-footer-top">
          <div>
            <AppLogo />
            <p>Personal health. Community strength.</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#privacy">Privacy approach</Link>
            <Link href="/auth">Sign in</Link>
            <Link href="/officer/access-request">Public health officers</Link>
          </nav>
        </div>
        <div className="ap-footer-bottom">
          <p>
            ? {new Date().getFullYear()} AfyaPulse. Health awareness, together.
          </p>
          <p>Built with care for our communities.</p>
        </div>
      </div>
    </footer>
  );
}
