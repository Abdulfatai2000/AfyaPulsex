import Link from "next/link";
import { ArrowUpRight, BriefcaseMedical } from "lucide-react";
// TODO(DEV4): unified sign-in must resolve roles from the verified server session.
// The entry query is only a UI intent; it cannot grant officer privileges.
export function OfficerAuthOptions() {
  return (
    <section className="ap-officer-entry" aria-labelledby="officer-entry-title">
      <BriefcaseMedical aria-hidden="true" className="size-5" />
      <div>
        <h2 id="officer-entry-title">Are you a Public Health Officer?</h2>
        <div className="ap-officer-links">
          <Link href="/auth?entry=officer">
            Sign in as Health Officer{" "}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
          <Link href="/officer/access-request">
            Request Health Officer Access{" "}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
