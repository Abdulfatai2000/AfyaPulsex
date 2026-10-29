"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Monitor, ShieldCheck } from "lucide-react";
import { PasswordChangeDialog } from "./PasswordChangeDialog";
import { SettingsCard, SettingsRow } from "./profile-ui";

export function SecuritySection({
  accountEmailMasked,
}: {
  accountEmailMasked?: string | null;
} = {}) {
  const [signOutNote, setSignOutNote] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  async function endSession() {
    setSigningOut(true); setSignOutNote(false);
    try {
      await signOut({ redirect: false });
      window.location.assign("/auth");
    } catch { setSignOutNote(true); setSigningOut(false); }
  }

  // TODO(DEV4): Dev 4 owns authentication, password operations, sessions, MFA,
  // and security enforcement. No credential is ever stored or sent here.

  return (
    <>
      <SettingsCard
        title="Account security"
        description="Manage access to your account."
      >
        <SettingsRow
          title="Two-factor authentication"
          description="Add an extra verification step when signing in."
          control={
            <span className="pf-muted" style={{ fontWeight: 600 }}>
              Unavailable
            </span>
          }
        />
        <SettingsRow
          title="Active sessions"
          description="Session details are currently unavailable."
          control={<Monitor aria-hidden="true" className="pf-muted" />}
        />
        {signOutNote ? (
          <div className="pf-status pf-status-warn" role="status">
            <ShieldCheck aria-hidden="true" />
            <span>
              Sign out is unavailable here. Your session has not been ended.
            </span>
          </div>
        ) : null}
        <SettingsRow
          title="Change password"
          description="Verify your account email before creating a new password."
          control={
            <PasswordChangeDialog accountEmailMasked={accountEmailMasked} />
          }
        />
      </SettingsCard>
    </>
  );
}
