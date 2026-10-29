"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Info,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ProfileServiceError,
  getOfficerDataAccess,
  type OfficerDataAccess,
} from "@/lib/services/officer/profile";

function BadgePill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      data-state={ok ? "granted" : "not-granted"}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
    >
      {ok ? (
        <CheckCircle2 className="size-3 text-success-green" aria-hidden="true" />
      ) : (
        <ShieldX className="size-3 text-muted-foreground" aria-hidden="true" />
      )}
      {label}
      <span className="sr-only">{ok ? "granted" : "not granted"}</span>
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 min-w-0 break-words text-sm font-medium text-deep-navy">
        {value ?? "—"}
      </dd>
    </div>
  );
}

/**
 * Data Access tab — informational only. Shows what surveillance information
 * the authenticated officer is authorized to access (role, jurisdiction,
 * organization, capabilities). Authorization is read-only here and always
 * remains backend-controlled.
 */
export function DataAccessSection() {
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "session-expired">("loading");
  const [access, setAccess] = useState<OfficerDataAccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    setError(null);
    void getOfficerDataAccess()
      .then((data) => {
        setAccess(data);
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
            : "Something went wrong loading your data access.",
        );
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-w-0 flex-col gap-4" aria-busy="true" aria-label="Loading data access">
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
          Sign in again to review your data access.
        </p>
      </div>
    );
  }

  if (status === "error" || !access) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger-red" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Unable to load your data access</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {error ?? "The data access summary could not be loaded. Please try again."}
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
          <ShieldCheck className="size-4 text-primary-blue" aria-hidden="true" />
          Authorized access
        </h2>
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <InfoRow label="Role" value={access.role} />
          <InfoRow label="Authorized jurisdiction" value={access.jurisdiction} />
          <InfoRow label="Organization" value={access.organization} />
        </dl>

        {access.scopeSummary ? (
          <div
            className="flex items-start gap-2 rounded-lg border border-primary-blue/20 bg-primary-blue/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
            role="note"
          >
            <Info className="mt-0.5 size-3.5 shrink-0 text-primary-blue" aria-hidden="true" />
            <span>
              <strong className="text-deep-navy">Scope:</strong> {access.scopeSummary}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-deep-navy">
          <UserRound className="size-4 text-primary-blue" aria-hidden="true" />
          Capabilities
        </h2>
        <div className="text-xs">
          <div className="flex flex-wrap items-center gap-2 py-1.5">
            <span className="text-muted-foreground">Approval authority</span>
            <span
              data-capsule
              className={access.canApprove
                ? "rounded-full bg-success-green/10 px-2 py-0.5 font-semibold text-success-green"
                : "rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-500"}
            >
              {access.canApprove ? "Granted" : "Not held"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 py-1.5">
            <span className="text-muted-foreground">Simulation (demo)</span>
            <span
              data-capsule
              className={access.canRunSimulation
                ? "rounded-full bg-success-green/10 px-2 py-0.5 font-semibold text-success-green"
                : "rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-500"}
            >
              {access.canRunSimulation ? "Granted" : "Not held"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-[11px] text-muted-foreground"
        role="note"
      >
        <MapPinned className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" />
        <span>
          This section is informational only — your authorization scope, role and
          permissions can never be changed from this page and remain controlled
          by the backend.
        </span>
      </div>

      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-[11px] text-muted-foreground"
        role="note"
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" />
        <span>
          You are authorized for surveillance information within your
          jurisdiction only. No citizen or patient records are shown here, and
          no individual health information is exposed.
        </span>
      </div>
    </div>
  );
}