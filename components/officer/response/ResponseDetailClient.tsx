"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ForbiddenState } from "@/components/feedback/ForbiddenState";
import { SessionExpiredState } from "@/components/feedback/SessionExpiredState";
import { UnauthorizedState } from "@/components/feedback/UnauthorizedState";
import type {
  ResponseDetail,
  ResponseDetailState,
} from "@/lib/services/officer/response";
import {
  ResponseServiceError,
  addResponseNote,
  advanceResponseStatus,
  getResponseById,
  reassignResponse,
} from "@/lib/services/officer/response";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getResponsesLive } from "@/lib/services/officer/live-adapters";
import { ResponseDetailView } from "./ResponseDetailView";

type LocalStatus = ResponseDetailState | "forbidden";

/** Server-driven access gate for the detail view. */
export type ResponseDetailAccess =
  | "authorized"
  | "unauthenticated"
  | "session-expired"
  | "forbidden";

function ResponseDetailLoading() {
  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      aria-busy="true"
      aria-label="Loading response details"
    >
      <Skeleton className="h-8 w-full rounded-lg" />
      <Skeleton className="h-8 w-2/3 rounded-lg" />
      <Skeleton className="h-4 w-1/2 rounded" />
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
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
  accessState?: ResponseDetailAccess;
}

export default function ResponseDetailClient({
  id,
  accessState = "authorized",
}: Props) {
  const { mode } = useDataMode();
  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [status, setStatus] = useState<LocalStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (responseId: string) => {
      // Centralized Data Mode (live has no response endpoint yet → error state).
      resolveOfficerData(mode, {
        demo: () => getResponseById(responseId),
        live: () => getResponsesLive(),
      })
        .then((data) => {
          setDetail(data);
          setStatus(data ? "ready" : "empty");
          setError(null);
        })
        .catch((err: unknown) => {
          setDetail(null);
          const mapped = mapFetchErrorStatus(err, ResponseServiceError);
          if (mapped === "unauthorized") {
            setStatus("forbidden");
          } else {
            setStatus("error");
            setError(
              err instanceof Error
                ? err.message
                : "Something went wrong loading this response.",
            );
          }
        });
    },
    [mode],
  );

  useEffect(() => {
    void load(id);
  }, [id, load]);

  /** Run a service-backed mutation and refresh local detail from its return. */
  const execute = useCallback(
    (task: () => Promise<ResponseDetail | null>) =>
      task().then((next) => {
        if (next) {
          setDetail(next);
        }
        return next;
      }),
    [],
  );

  if (accessState === "unauthenticated") {
    return (
      <UnauthorizedState
        title="Sign in to continue"
        description="You need to sign in to view response details."
      />
    );
  }

  if (accessState === "session-expired") {
    return (
      <SessionExpiredState description="Your session has ended. Please sign in again to continue viewing responses." />
    );
  }

  if (accessState === "forbidden" || status === "forbidden") {
    return (
      <ForbiddenState description="This response is outside your assigned jurisdiction or you lack the required permission." />
    );
  }

  if (status === "loading") {
    return <ResponseDetailLoading />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Unable to load response"
        description={
          error ?? "Something went wrong while loading this response."
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

  if (status === "empty" || !detail) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <EmptyState
          title="Response not found"
          description={`No response matches reference ${id}. It may have been removed or is outside your jurisdiction.`}
        />
        <p className="text-center text-xs text-muted-foreground">
          Return to the <Link href="/officer/response">responses list</Link> to
          see active responses.
        </p>
      </div>
    );
  }

  // Mutations follow the active mode. Live has no response endpoint yet, so
  // actions surface the live error inline (never demo data).
  const live = mode === "live";

  return (
    <ResponseDetailView
      detail={detail}
      onAdvance={() =>
        execute(() => (live ? getResponsesLive() : advanceResponseStatus(detail.id)))
      }
      onReassign={(officer) =>
        execute(() => (live ? getResponsesLive() : reassignResponse(detail.id, officer)))
      }
      onAddNote={(body) =>
        execute(() => (live ? getResponsesLive() : addResponseNote(detail.id, body)))
      }
    />
  );
}