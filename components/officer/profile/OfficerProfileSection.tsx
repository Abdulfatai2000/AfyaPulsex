"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Eye, Loader2, Pencil, RefreshCw, TriangleAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "cn";
import {
  ProfileServiceError,
  updateOfficerProfile,
  type OfficerProfile,
} from "@/lib/services/officer/profile";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getOfficerProfileLive } from "@/lib/services/officer/live-adapters";
import { useOfficerProfile } from "@/components/layout/officer/OfficerProfileContext";
import { ProfilePhotoSection } from "./ProfilePhotoSection";

type LoadStatus = "loading" | "ready" | "error" | "session-expired";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 min-w-0 break-words text-sm font-medium text-deep-navy">
        {value}
      </dd>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div
      className="flex min-w-0 flex-col gap-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
      aria-busy="true"
      aria-label="Loading officer profile"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 flex-none rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid gap-x-8 sm:grid-cols-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5 py-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Profile tab — shows the authenticated officer's account information and lets
 * them edit the non-authoritative fields (name, email, phone, organization).
 * Role, jurisdiction and verification status are authorization-controlled and
 * stay read-only, driven by the backend.
 */
export function OfficerProfileSection() {
  const { mode } = useDataMode();
  const { refresh: refreshProfile } = useOfficerProfile();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [profile, setProfile] = useState<OfficerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
  });
  const [validation, setValidation] = useState<Record<string, string | null>>({
    name: null,
    email: null,
    phone: null,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    setError(null);
    // Centralized Data Mode: demo identity or the live session/profile
    // boundary (backend remains authoritative for authorization).
    void resolveOfficerData(mode, {
      demo: () => getOfficerProfileLive(),
      live: () => getOfficerProfileLive(),
    })
      .then((data) => {
        setProfile(data);
        setDraft({
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          organization: data.organization ?? "",
        });
        setStatus("ready");
      })
      .catch((err: unknown) => {
        const mapped = mapFetchErrorStatus(err, ProfileServiceError);
        setStatus(
          mapped === "unauthorized" || mapped === "session-expired"
            ? "session-expired"
            : "error",
        );
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong loading your profile.",
        );
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const startEditing = () => {
    if (!profile) {
      return;
    }
    setDraft({
      name: profile.name ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      organization: profile.organization ?? "",
    });
    setValidation({ name: null, email: null, phone: null });
    setSaveError(null);
    setSaveSuccess(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setValidation({ name: null, email: null, phone: null });
    setSaveError(null);
    setSaveSuccess(null);
  };

  const validate = (): boolean => {
    const next: Record<string, string | null> = {
      name: null,
      email: null,
      phone: null,
    };
    if (!draft.name.trim()) {
      next.name = "Full name is required.";
    }
    const email = draft.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email address.";
    }
    const phone = draft.phone.trim();
    if (phone && !/^[+\d][\d\s()-]{6,}$/.test(phone)) {
      next.phone = "Enter a valid phone number.";
    }
    setValidation(next);
    return !Object.values(next).some(Boolean);
  };

  const handleSave = () => {
    if (saving || !profile) {
      return;
    }
    if (!validate()) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    void updateOfficerProfile({
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      organization: draft.organization.trim(),
    })
      .then((updated) => {
        setProfile(updated);
        setEditing(false);
        setSaving(false);
        setSaveSuccess("Profile updated.");
        setValidation({ name: null, email: null, phone: null });
        void refreshProfile();
      })
      .catch((err: unknown) => {
        setSaving(false);
        setSaveError(
          err instanceof Error
            ? err.message
            : "Your profile could not be updated. Please try again.",
        );
      });
  };

  if (status === "loading") {
    return <ProfileSkeleton />;
  }

  if (status === "session-expired") {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Your session has expired</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in again to view and manage your profile.
        </p>
      </div>
    );
  }

  if (status === "error" || !profile) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger-red" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Unable to load your profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {error ?? "The profile could not be loaded. Please try again."}
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

  const readOnly = [
    { label: "Role", value: profile.role },
    { label: "Jurisdiction", value: profile.jurisdiction ?? "—" },
    {
      label: "Verification",
      value:
        profile.verificationStatus === "verified"
          ? "Verified"
          : "Pending",
    },
  ];

  const handlePhotoChange = (updated: OfficerProfile) => {
    // Local card updates immediately; the shared header avatar re-syncs
    // through the profile context (single avatar system, no duplicates).
    setProfile(updated);
    void refreshProfile();
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {saveSuccess ? (
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-success-green/30 bg-success-green/10 px-3 py-2.5 text-xs font-medium text-success-green"
        >
          <CheckCircle2 className="size-4 flex-none" aria-hidden="true" />
          {saveSuccess}
        </p>
      ) : null}

      <ProfilePhotoSection
        name={profile.name}
        avatarUrl={profile.avatarUrl}
        onProfileChange={handlePhotoChange}
      />

      <div className="flex min-w-0 flex-col gap-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar size="lg" className="size-16 border border-border">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="bg-primary-blue text-white">
                {initials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-deep-navy">
                {profile.name}
              </h2>
              <p className="text-sm text-muted-foreground">{profile.role}</p>
              <p className="text-xs text-muted-foreground">
                {profile.organization}
              </p>
              <span
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  profile.verificationStatus === "verified"
                    ? "bg-success-green/10 text-success-green"
                    : "bg-warning-amber/10 text-warning-amber",
                )}
              >
                <CheckCircle2
                  className={cn(
                    "size-3",
                    profile.verificationStatus === "verified"
                      ? "text-success-green"
                      : "text-warning-amber",
                  )}
                  aria-hidden="true"
                />
                Active ({profile.verificationStatus === "verified" ? "Verified" : "Pending"})
                <span className="sr-only">
                  {profile.verificationStatus === "verified"
                    ? "Account active and verified"
                    : "Account active with pending verification"}
                </span>
              </span>
            </div>
          </div>
          {!editing ? (
            <Button
              onClick={startEditing}
              type="button"
              className="w-fit gap-1.5"
              aria-label="Edit profile"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit Profile
            </Button>
          ) : null}
        </div>

        <div className="border-t border-gray-100" />

        {!editing ? (
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <InfoRow label="Email" value={profile.email ?? "—"} />
            <InfoRow label="Phone" value={profile.phone ?? "—"} />
            <InfoRow label="Organization" value={profile.organization ?? "—"} />
            <InfoRow label="Jurisdiction" value={profile.jurisdiction ?? "—"} />
            <InfoRow label="Role" value={profile.role} />
            <InfoRow
              label="Status"
              value={
                profile.verificationStatus === "verified"
                  ? "Active (Verified)"
                  : "Active (Pending verification)"
              }
            />
          </dl>
        ) : (
          <form
            className="flex min-w-0 flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            noValidate
          >
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="profile-name">Full Name</Label>
                <Input
                  id="profile-name"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  aria-invalid={validation.name ? true : undefined}
                  aria-describedby={
                    validation.name ? "profile-name-error" : undefined
                  }
                />
                {validation.name ? (
                  <p
                    id="profile-name-error"
                    role="alert"
                    className="text-xs text-danger-red"
                  >
                    {validation.name}
                  </p>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, email: e.target.value }))
                  }
                  aria-invalid={validation.email ? true : undefined}
                  aria-describedby={
                    validation.email ? "profile-email-error" : undefined
                  }
                />
                {validation.email ? (
                  <p
                    id="profile-email-error"
                    role="alert"
                    className="text-xs text-danger-red"
                  >
                    {validation.email}
                  </p>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  type="tel"
                  autoComplete="tel"
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, phone: e.target.value }))
                  }
                  aria-invalid={validation.phone ? true : undefined}
                  aria-describedby={
                    validation.phone ? "profile-phone-error" : undefined
                  }
                />
                {validation.phone ? (
                  <p
                    id="profile-phone-error"
                    role="alert"
                    className="text-xs text-danger-red"
                  >
                    {validation.phone}
                  </p>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="profile-organization">Organization</Label>
                <Input
                  id="profile-organization"
                  value={draft.organization}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, organization: e.target.value }))
                  }
                />
              </div>
            </div>

            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 text-[11px] text-muted-foreground"
              role="note"
            >
              <Eye className="h-3.5 w-3.5 shrink-0 text-primary-blue" aria-hidden="true" />
              <span>
                Role, jurisdiction and verification status are managed by the
                backend and cannot be changed here.
              </span>
            </div>

            {saveError ? (
              <p
                role="alert"
                className="flex items-center gap-1.5 text-xs text-danger-red"
              >
                <TriangleAlert className="size-3.5 flex-none" aria-hidden="true" />
                {saveError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                disabled={saving}
                className="gap-1.5"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                )}
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-[11px] text-muted-foreground"
        role="note"
      >
        <UserRound className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" />
        <span>
          Profile &amp; Settings shows account information only — it never
          displays citizen or patient records, and no credentials or access
          tokens are stored or rendered in this view.
        </span>
      </div>
    </div>
  );
}