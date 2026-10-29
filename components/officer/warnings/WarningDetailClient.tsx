"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateAlertDraftAction } from "@/server/actions/officer/public-alerts";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ForbiddenState } from "@/components/feedback/ForbiddenState";
import { SessionExpiredState } from "@/components/feedback/SessionExpiredState";
import { UnauthorizedState } from "@/components/feedback/UnauthorizedState";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  EarlyWarning,
  WarningDetailState,
} from "@/lib/services/officer/warnings";
import { getWarningById } from "@/lib/services/officer/warnings";
import { resolveOfficerData } from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getWarningByIdLive } from "@/lib/services/officer/live-adapters";
import { WarningDetailView } from "./WarningDetailView";

/** Server-driven access gate for the detail view. */
export type WarningDetailAccess =
  "authorized" | "unauthenticated" | "session-expired" | "forbidden";

function WarningDetailLoading() {
  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      aria-busy="true"
      aria-label="Loading warning details"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Skeleton className="h-52 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

interface Props {
  id: string;
  /**
   * Gate driven by the server-side session (DEV4). Contributes the
   * unauthorized / forbidden / session-expired states. Defaults to
   * "authorized" only while no session boundary exists anywhere in the
   * scaffold — it must never assert a real session.
   */
  accessState?: WarningDetailAccess;
}

export default function WarningDetailClient({
  id,
  accessState = "authorized",
}: Props) {
  const { mode } = useDataMode();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setGenerationError(null);
    try {
      const result = await generateAlertDraftAction(id);
      if (!result.ok) setGenerationError(result.error);
      else router.push(`/officer/public-alerts/${result.id}`);
    } catch {
      setGenerationError(
        "Unable to generate a draft. Check your access and try again.",
      );
    } finally {
      setGenerating(false);
    }
  };
  const [warning, setWarning] = useState<EarlyWarning | null>(null);
  const [status, setStatus] = useState<WarningDetailState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (warningId: string) => {
      resolveOfficerData(mode, {
        demo: () => getWarningById(warningId),
        live: () => getWarningByIdLive(warningId),
      })
        .then((data) => {
          setWarning(data);
          setStatus(data ? "ready" : "empty");
        })
        .catch((err: unknown) => {
          setWarning(null);
          setStatus("error");
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong loading this warning.",
          );
        });
    },
    [mode],
  );

  useEffect(() => {
    void load(id);
  }, [id, load]);

  if (accessState === "unauthenticated") {
    return (
      <UnauthorizedState
        title="Sign in to continue"
        description="You need to sign in to view Early Warning details."
      />
    );
  }

  if (accessState === "session-expired") {
    return (
      <SessionExpiredState description="Your session has ended. Please sign in again to continue viewing warnings." />
    );
  }

  if (accessState === "forbidden") {
    return (
      <ForbiddenState description="This warning is outside your assigned jurisdiction or you lack the required permission." />
    );
  }

  if (status === "loading") {
    return <WarningDetailLoading />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Unable to load warning"
        description={
          error ?? "Something went wrong while loading this warning."
        }
        action={
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              setStatus("loading");
              setError(null);
              void load(id);
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  if (status === "empty" || !warning) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <EmptyState
          title="Warning not found"
          description={`No warning matches reference ${id}. It may have been removed or is outside your jurisdiction.`}
        />
        <div className="flex w-full justify-center">
          <Link
            href="/officer/warnings"
            className="inline-flex h-7 w-fit items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Back to warnings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WarningDetailView warning={warning} />
      {mode === "live" && (
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Generate a draft for Officer review. It will remain unpublished
            until explicitly approved.
          </p>
          <Button onClick={generate} disabled={generating}>
            {generating && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            {generating ? "Generating draft..." : "Generate AI Draft"}
          </Button>
          {generationError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {generationError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
