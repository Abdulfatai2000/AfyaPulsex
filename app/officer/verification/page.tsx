import { PageHeader } from "@/components/shared/PageHeader";
import { VerificationStatusClient } from "@/components/officer/verification/VerificationStatusClient";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

export default function VerificationPage() {
  return (
    <div className="ap-public">
      <PublicHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="w-full min-w-0">
          <PageHeader title="Verification & Approval Status" />
          <VerificationStatusClient />
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}