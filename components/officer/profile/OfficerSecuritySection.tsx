"use client";

import { useEffect, useState } from "react";
import {
  KeyRound,
  Loader2,
  LockKeyhole,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ProfileServiceError,
  getOfficerSecuritySettings,
  signOutOfficer,
  type OfficerSecuritySettings,
} from "@/lib/services/officer/profile";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Security tab. Only shows functionality the existing authentication
 * architecture supports: session/sign-in metadata, verification state, and a
 * confirmed sign-out integration point. No passwords, tokens or secrets are
 * ever rendered; password management is described as provider-managed.
 */
export function OfficerSecuritySection() {
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "session-expired">("loading");
  const [security, setSecurity] = useState<OfficerSecuritySettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    setError(null);
    void getOfficerSecuritySettings()
      .then((data) => {
        setSecurity(data);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        setStatus(
          err instanceof ProfileServiceError && err.code === "unauthorized"
            ? "session-expired"
            : "error",
        );
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong loading security settings.",
        );
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSignOutConfirm = () => {
    setSignOutError(null);
    setConfirmSignOut(true);
  };

  const handleSignOut = () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    setSignOutError(null);
    void signOutOfficer().then(() => setSigningOut(false)).catch((err: unknown) => {
      setSigningOut(false);
      setSignOutError(
        err instanceof Error
          ? err.message
          : "Sign-out could not be completed. Please try again.",
      );
    });
  };

  if (status === "loading") {
    return (
      <div className="flex min-w-0 flex-col gap-4" aria-busy="true" aria-label="Loading security settings">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (status === "session-expired") {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Your session has expired</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in again to manage your security settings.
        </p>
      </div>
    );
  }

  if (status === "error" || !security) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger-red" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Unable to load security settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {error ?? "The security settings could not be loaded. Please try again."}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} type="button">
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-deep-navy">
          <MonitorSmartphone className="size-4 text-primary-blue" aria-hidden="true" />
          Session &amp; devices
        </h2>
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <div className="min-w-0 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active sessions
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-deep-navy">
              {security.activeSessionsCount}
            </dd>
          </div>
          <div className="min-w-0 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Last sign-in
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-deep-navy">
              {security.lastSignInAt ? formatDateTime(security.lastSignInAt) : "—"}
            </dd>
          </div>
        </dl>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Session and device details are provided by your authentication
          provider. No session tokens or credentials are shown here.
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-deep-navy">
          <KeyRound className="size-4 text-primary-blue" aria-hidden="true" />
          Password
        </h2>
        <div
          className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
          role="note"
        >
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" />
          <span>
            Password changes are managed by your organization&apos;s authentication
            provider and are not exposed in this portal. Passwords are never
            stored, displayed, or transmitted by this application&apos;s frontend.
          </span>
        </div>
        {security.canChangePassword ? (
          <p className="text-xs text-muted-foreground">
            Your provider supports in-portal password changes; the secure flow
            appears when the authentication boundary is connected.
          </p>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-deep-navy">
          <ShieldCheck className="size-4 text-primary-blue" aria-hidden="true" />
          Sign out
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          UI integration point for sign-out. It contains no authentication
          logic — use the confirmation below, the same flow used by the portal
          header.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openSignOutConfirm} type="button">
            Sign out
          </Button>
          {!security.canSignOutOthers ? (
            <span className="text-[11px] text-muted-foreground">
              Signing out of other sessions is handled by your authentication
              provider.
            </span>
          ) : null}
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-[11px] text-muted-foreground"
        role="note"
      >
        <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" />
        <span>
          For privacy, this section never exposes passwords, authentication
          secrets, access tokens, or any citizen or patient information.
        </span>
      </div>

      <Dialog open={confirmSignOut} onOpenChange={(next) => { if (!next) setConfirmSignOut(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out of your session?</DialogTitle>
            <DialogDescription>
              Confirm the signed-out session. The auth boundary is not wired
              yet, so no session is ended here.
            </DialogDescription>
          </DialogHeader>
          {signOutError ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-danger-red">
              <TriangleAlert className="size-3.5 flex-none" aria-hidden="true" />
              {signOutError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmSignOut(false)}
              disabled={signingOut}
              type="button"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSignOut} disabled={signingOut} type="button">
              {signingOut ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}