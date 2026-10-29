"use client";

import { useState } from "react";
import type { OfficerMapScope } from "@/lib/services/officer/map-scope";
import type { AccessRequest, ApprovalsTab } from "@/lib/services/officer/access-approvals";
import { ApprovalTabs } from "./ApprovalTabs";
import { ApprovalTable } from "./ApprovalTable";
import { ApprovalReview } from "./ApprovalReview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/** Synthetic display only: no real approval endpoints or evidence downloads. */
export default function DemoApprovals({ scope }: { scope: OfficerMapScope }) {
  const [tab, setTab] = useState<ApprovalsTab>("pending");
  const [selected, setSelected] = useState<AccessRequest | null>(null);
  const [submittedAt] = useState(() => new Date().toISOString());
  const names = ["Amina Bello", "Chinedu Okafor", "Yetunde Adeyemi", "Ibrahim Musa"];
  const statuses: ApprovalsTab[] = ["pending", "pending", "approved", "rejected"];
  const states = scope.states.filter(state => !scope.stateId || state.id === scope.stateId);
  const requests: AccessRequest[] = states.length ? names.map((name, index) => {
    const state = states[index % states.length];
    const lga = scope.lgaId ? state.lgas.find(area => area.id === scope.lgaId) : state.lgas[index % Math.max(1, state.lgas.length)];
    const status = statuses[index];
    return {
      id: `demo-approval-${index}`, applicantName: `${name} (Demo)`,
      requestedRole: lga ? "lga-officer" : "state-officer",
      roleLabel: lga ? "LGA DSNO" : "State Surveillance Officer",
      jurisdictionType: lga ? "lga" : "state", stateId: state.id, stateName: state.name,
      lgaId: lga?.id ?? null, lgaName: lga?.name ?? null,
      jurisdictionLabel: lga ? `${lga.name}, ${state.name}` : state.name,
      submittedAt, status, decidedAt: status === "pending" ? null : submittedAt,
      decidedByLabel: status === "pending" ? null : "Demo reviewing authority",
      additionalInfo: `Synthetic application for ${lga ? "the LGA Disease Surveillance & Notification Unit" : "the State Epidemiology & Surveillance Unit"}.`,
      rejectionReason: status === "rejected" ? "Sample decision: appointment evidence requires clarification." : null,
      evidence: null,
    };
  }) : [];
  const counts = {
    pending: requests.filter(row => row.status === "pending").length,
    approved: requests.filter(row => row.status === "approved").length,
    rejected: requests.filter(row => row.status === "rejected").length,
  };
  return <div className="flex min-w-0 flex-col gap-4">
    <p role="status" className="text-sm text-muted-foreground">Synthetic approval examples within {scope.label}. View-only; no real applications or account permissions are changed.</p>
    <ApprovalTabs value={tab} onChange={setTab} counts={counts} />
    <ApprovalTable requests={requests.filter(row => row.status === tab)} actionLabel="View" onOpen={setSelected} />
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Demo access request</DialogTitle><DialogDescription>Fictional applicant. Approval and rejection are unavailable for demo accounts.</DialogDescription></DialogHeader>
        {selected && <ApprovalReview request={selected} />}
      </DialogContent>
    </Dialog>
  </div>;
}
