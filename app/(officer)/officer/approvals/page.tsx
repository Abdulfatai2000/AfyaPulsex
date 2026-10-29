import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getApprovalPermissions } from "@/lib/services/officer/access-approvals";
import ApprovalsCenterClient from "@/components/officer/approvals/ApprovalsCenterClient";
import DemoApprovals from "@/components/officer/approvals/DemoApprovals";
import { getServerDataMode } from "@/lib/services/officer/data-mode-server";
import { getOfficerMapContext } from "@/server/services/officer-map-scope";

function ApprovalsFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <div className="flex min-w-0 gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white p-1">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-8 w-28 flex-none rounded-lg" />
        ))}
      </div>
      <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-6"
          >
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ApprovalsPage() {
  if (await getServerDataMode() === "demo") {
    const { scope } = await getOfficerMapContext();
    return <section className="flex min-w-0 flex-col gap-4">
      <PageHeader title="Approvals" description="Explore sample public-health officer access requests." />
      <DemoApprovals scope={scope} />
    </section>;
  }
  // Approval authority (and its scope/jurisdictions) is backend-provided; the
  // page consumes it at the boundary and renders the queue OR a permission-
  // denied state accordingly. No role-name heuristics live in the UI.
  const permissions = await getApprovalPermissions();

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Approvals"
        description="Review and decide who may access AfyaPulse as an officer. Having portal access does not grant approval authority — this queue respects the approval scope and authorized jurisdictions provided by the backend."
      />
      <Suspense fallback={<ApprovalsFallback />}>
        <ApprovalsCenterClient initialPermissions={permissions} />
      </Suspense>
    </section>
  );
}
