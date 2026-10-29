import { requireApprovedOfficer } from "@/server/auth/rbac";
import type { ReactNode } from "react";
import "./officer-ui.css";
import { OfficerPortalLayout } from "./OfficerPortalLayout";
import { OfficerProfileProvider } from "./OfficerProfileContext";
import { DataModeProvider } from "@/components/officer/data-mode/DataModeProvider";
// TODO(DEV4): enforce route access server-side. Access-request and verification
// must remain reachable for unauthenticated/pending officers as appropriate.
export async function OfficerShell({ children }: { children: ReactNode }) {
  // Desktop (lg+): viewport-locked shell. The header and sidebar are fixed
  // regions that never move; ONLY the main content column scrolls
  // (lg:overflow-y-auto) — a single vertical scrollbar, no nested overflow.
  // Mobile keeps natural page/body scrolling with its own sticky header +
  // bottom nav.
  const session = await requireApprovedOfficer();
  const mode = session.user.isDemo ? "demo" : "live";
  return (
    <div className="officer-portal-root min-h-screen min-w-0 overflow-x-clip bg-off-white pb-24 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden lg:pb-0">
      <DataModeProvider key={session.userId} mode={mode} accountId={session.userId}>
        <OfficerProfileProvider>
          <OfficerPortalLayout>{children}</OfficerPortalLayout>
        </OfficerProfileProvider>
      </DataModeProvider>
    </div>
  );
}
