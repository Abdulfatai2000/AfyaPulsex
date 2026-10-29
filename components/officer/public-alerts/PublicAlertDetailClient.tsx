"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SessionExpiredState } from "@/components/feedback/SessionExpiredState";
import type { PublicAlertDetail } from "@/lib/services/officer/public-alerts";
import { PublicAlertsServiceError } from "@/lib/services/officer/public-alerts";
import { getPublicAlertDetail } from "@/lib/services/officer/public-alerts";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getPublicAlertDetailLive } from "@/lib/services/officer/live-adapters";
import { PublicAlertStatusBadge } from "./PublicAlertStatus";
import { PublicAlertUrgencySignal } from "./PublicAlertStatus";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PublicAlertForm } from "./PublicAlertForm";
import {
  updatePublicAlertAction,
  publishPublicAlertAction,
} from "@/server/actions/officer/public-alerts";
import { PublicAlertPreview } from "./PublicAlertPreview";

function PublicAlertDetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6"
      aria-busy="true"
      aria-label="Loading alert details"
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-2/3" />
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

function DetailMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-deep-navy">
        {value}
      </dd>
    </div>
  );
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function PublicAlertDetailClient({ id }: { id: string }) {
  const { mode } = useDataMode();
  const [editing, setEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [alert, setAlert] = useState<PublicAlertDetail | null>(null);
  const [state, setState] = useState<
    "loading" | "ready" | "empty" | "error" | "unauthorized" | "session-expired"
  >("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    resolveOfficerData(mode, {
      demo: () => getPublicAlertDetail(id),
      live: () => getPublicAlertDetailLive(id),
    })
      .then((detail) => {
        if (detail) {
          setAlert(detail);
          setState("ready");
        } else {
          setState("empty");
        }
        setError(null);
      })
      .catch((err: unknown) => {
        const mapped = mapFetchErrorStatus(err, PublicAlertsServiceError);
        if (mapped === "unauthorized") {
          setState("unauthorized");
        } else if (mapped === "session-expired") {
          setState("session-expired");
        } else {
          setState("error");
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong loading this alert.",
          );
        }
      });
  }, [id, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") {
    return <PublicAlertDetailSkeleton />;
  }

  if (state === "session-expired") {
    return <SessionExpiredState title="Your session has expired" />;
  }

  if (state === "unauthorized") {
    return (
      <EmptyState
        title="Jurisdiction access restricted"
        description="You are not authorized to view this public alert. Backend authorization remains authoritative for your access."
      />
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 py-12 text-center">
        <RefreshCw className="h-5 w-5 text-danger-red" aria-hidden="true" />
        <p className="text-sm font-semibold text-deep-navy">
          Unable to load this alert
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          {error ?? "Something went wrong. Please try again."}
        </p>
        <Button variant="outline" size="sm" onClick={load} type="button">
          Retry
        </Button>
      </div>
    );
  }

  if (state === "empty" || !alert) {
    return (
      <EmptyState
        title="Alert not found"
        description="This public alert could not be found. It may have been removed or the reference is incorrect."
      />
    );
  }

  const areaLabel = alert.lgaName ? `${alert.lgaName} LGA` : alert.stateName;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link
        href="/officer/public-alerts"
        className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-medium text-primary-blue outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary-blue/60"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        Back to public alerts
      </Link>

      <div className="flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="min-w-0 text-xl font-bold leading-snug text-deep-navy sm:text-2xl">
            {alert.title}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <PublicAlertUrgencySignal level={alert.level} />
            <PublicAlertStatusBadge status={alert.status} />
          </div>
        </div>

        <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailMetaRow label="Area" value={areaLabel} />
          <DetailMetaRow
            label="Published to"
            value={
              alert.publishedAt
                ? DATE_FORMATTER.format(new Date(alert.publishedAt))
                : "Not published"
            }
          />
          <DetailMetaRow label="Audience" value={alert.audience} />
          <DetailMetaRow
            label="Last updated"
            value={DATE_FORMATTER.format(new Date(alert.lastUpdated))}
          />
        </dl>

        {mode === "live" && alert.status === "draft" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Review the title, message, area and channels. Publishing makes
              this message available to residents. AI copy requires your review.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={publishing}
                onClick={() => setEditing(true)}
              >
                Review / edit draft
              </Button>
              <Button
                disabled={publishing}
                onClick={async () => {
                  setPublishing(true);
                  setPublishError(null);
                  try {
                    const result = await publishPublicAlertAction({
                      id: alert.id,
                      revision: alert.lastUpdated,
                    });
                    if (!result.ok) setPublishError(result.error);
                    else load();
                  } catch {
                    setPublishError(
                      "Unable to publish. Check your publishing permission and try again.",
                    );
                  } finally {
                    setPublishing(false);
                  }
                }}
              >
                {publishing && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {publishing ? "Publishing..." : "Publish reviewed alert"}
              </Button>
            </div>
            {publishError && (
              <p role="alert" className="text-sm text-destructive">
                {publishError}
              </p>
            )}
            <Dialog open={editing} onOpenChange={setEditing}>
              <DialogContent className="sm:max-w-2xl">
                <PublicAlertForm
                  initial={alert}
                  onCancel={() => setEditing(false)}
                  onSubmit={async (input) => {
                    const copy = {
                      title: input.title,
                      body: input.body,
                      level: input.level,
                      channels: input.channels,
                      audience: input.audience,
                    };
                    const result = await updatePublicAlertAction({
                      ...copy,
                      id: alert.id,
                      revision: alert.lastUpdated,
                    });
                    if (!result.ok) throw new Error(result.error);
                    load();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}

        <PublicAlertPreview
          title={alert.title}
          areaLabel={areaLabel}
          level={alert.level}
          body={alert.body}
          channels={alert.channels}
        />
      </div>
    </div>
  );
}
