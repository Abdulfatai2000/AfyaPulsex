"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ProfileServiceError,
  getOfficerNotificationPreferences,
  updateOfficerNotificationPreferences,
  type OfficerNotificationPreferences,
} from "@/lib/services/officer/profile";

type Channel = keyof OfficerNotificationPreferences;

const CHANNELS: ReadonlyArray<{
  key: Channel;
  title: string;
  description: string;
}> = [
  {
    key: "healthSignalNotifications",
    title: "Health signal notifications",
    description:
      "New or elevated aggregate health-signal activity detected in your jurisdiction.",
  },
  {
    key: "investigationNotifications",
    title: "Investigation notifications",
    description:
      "Investigation status changes and updates that involve your team.",
  },
  {
    key: "accessRequestNotifications",
    title: "Access-request notifications",
    description:
      "Officer access requests that need your attention (if you hold approval authority).",
  },
  {
    key: "systemNotifications",
    title: "System notifications",
    description:
      "Account, session and system-level notices about the officer portal.",
  },
];

function Toggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  const id = `notif-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 max-w-md">
        <p className="text-sm font-medium text-deep-navy">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-6 w-11 flex-none rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-blue/60 disabled:opacity-50",
          checked ? "bg-primary-blue" : "bg-gray-300",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

/**
 * Notifications preferences (this tab controls PREFERENCES — not the
 * Notifications / Alerts Center, which displays actual notifications).
 * Preferences persist through the service boundary.
 */
export function OfficerNotificationSettings() {
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "session-expired">("loading");
  const [prefs, setPrefs] = useState<OfficerNotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<OfficerNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    setError(null);
    void getOfficerNotificationPreferences()
      .then((data) => {
        setPrefs(data);
        setDraft({ ...data });
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
            : "Something went wrong loading notification preferences.",
        );
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePref = (key: Channel, next: boolean) => {
    if (!draft) {
      return;
    }
    setSaveMessage(null);
    setSaveError(null);
    setDraft((d) => (d ? { ...d, [key]: next } : d));
  };

  const handleSave = () => {
    if (!draft || loading) {
      return;
    }
    setLoading(true);
    setSaveError(null);
    setSaveMessage(null);
    void updateOfficerNotificationPreferences(draft)
      .then((updated) => {
        setPrefs(updated);
        setDraft({ ...updated });
        setLoading(false);
        setSaveMessage("Notification preferences saved.");
      })
      .catch((err: unknown) => {
        setLoading(false);
        setSaveError(
          err instanceof Error
            ? err.message
            : "Your notification preferences could not be saved. Please try again.",
        );
      });
  };

  if (status === "loading") {
    return (
      <div className="flex min-w-0 flex-col gap-4" aria-busy="true" aria-label="Loading notification preferences">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (status === "session-expired") {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Your session has expired</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in again to manage your notification preferences.
        </p>
      </div>
    );
  }

  if (status === "error" || !draft) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger-red" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Unable to load notification preferences</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {error ?? "The preferences could not be loaded. Please try again."}
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
      {saveMessage ? (
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-success-green/30 bg-success-green/10 px-3 py-2.5 text-xs font-medium text-success-green"
        >
          <CheckCircle2 className="size-4 flex-none" aria-hidden="true" />
          {saveMessage}
        </p>
      ) : null}

      <div className="flex min-w-0 flex-col gap-1 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-5 py-2">
        {CHANNELS.map((channel) => (
          <Toggle
            key={channel.key}
            label={channel.title}
            description={channel.description}
            checked={draft[channel.key]}
            onCheckedChange={(next) => changePref(channel.key, next)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={loading} type="button" className="gap-1.5">
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          )}
          {loading ? "Saving…" : "Save Preferences"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Preferences apply to how notifications are delivered to you inside the
          portal; the Notifications page shows the actual notifications.
        </span>
      </div>

      {saveError ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-danger-red">
          <TriangleAlert className="size-3.5 flex-none" aria-hidden="true" />
          {saveError}
        </p>
      ) : null}

      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-[11px] text-muted-foreground"
        role="note"
      >
        <BellRing className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" />
        <span>
          These are delivery preferences only — notifications remain
          officer-facing operational summaries and never contain citizen
          records or individual health information.
        </span>
      </div>
    </div>
  );
}