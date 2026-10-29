"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ForbiddenState } from "@/components/feedback/ForbiddenState";
import { SessionExpiredState } from "@/components/feedback/SessionExpiredState";
import { UnauthorizedState } from "@/components/feedback/UnauthorizedState";
import type {
  InvestigationDetail,
  InvestigationDetailState,
} from "@/lib/services/officer/investigations";
import {
  InvestigationsServiceError,
  addInvestigationNote,
  getInvestigationById,
  setInvestigationAssignedTo,
  setInvestigationStatus,
} from "@/lib/services/officer/investigations";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import {
  addInvestigationNoteLive,
  getInvestigationByIdLive,
  setInvestigationAssignedToLive,
  setInvestigationStatusLive,
} from "@/lib/services/officer/live-adapters";
import { InvestigationDetailView } from "./InvestigationDetailView";

type LocalStatus = InvestigationDetailState | "forbidden";

/** Server-driven access gate for the detail view. */
export type InvestigationDetailAccess =
  | "authorized"
  | "unauthenticated"
  | "session-expired"
  | "forbidden";

function InvestigationDetailLoading() {
  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      aria-busy="true"
      aria-label="Loading investigation details"
    >
      <Skeleton className="h-4 w-32 rounded" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 w-2/3 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-1/2 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className="flex gap-1 overflow-hidden rounded-xl border border-gray-200 bg-white p-1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-8 w-16 flex-none rounded-lg" />
        ))}
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
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
  accessState?: InvestigationDetailAccess;
}

export default function InvestigationDetailClient({
  id,
  accessState = "authorized",
}: Props) {
  const { mode } = useDataMode();
  const [detail, setDetail] = useState<InvestigationDetail | null>(null);
  const [status, setStatus] = useState<LocalStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (investigationId: string) => {
      // Centralized Data Mode: demo service or live backend, never mixed.
      resolveOfficerData(mode, {
        demo: () => getInvestigationById(investigationId),
        live: () => getInvestigationByIdLive(investigationId),
      })
        .then((data) => {
          setDetail(data);
          setStatus(data ? "ready" : "empty");
          setError(null);
        })
        .catch((err: unknown) => {
          setDetail(null);
          const mapped = mapFetchErrorStatus(err, InvestigationsServiceError);
          if (mapped === "unauthorized") {
            setStatus("forbidden");
          } else {
            setStatus("error");
            setError(
              err instanceof Error
                ? err.message
                : "Something went wrong loading this investigation.",
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
    (task: () => Promise<InvestigationDetail | null>) =>
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
        description="You need to sign in to view investigation details."
      />
    );
  }

  if (accessState === "session-expired") {
    return (
      <SessionExpiredState description="Your session has ended. Please sign in again to continue viewing investigations." />
    );
  }

  if (accessState === "forbidden" || status === "forbidden") {
    return (
      <ForbiddenState description="This investigation is outside your assigned jurisdiction or you lack the required permission." />
    );
  }

  if (status === "loading") {
    return <InvestigationDetailLoading />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Unable to load investigation"
        description={
          error ?? "Something went wrong while loading this investigation."
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
          title="Investigation not found"
          description={`No investigation matches reference ${id}. It may have been removed or is outside your jurisdiction.`}
        />
        <div className="flex w-full justify-center">
          <Link
            href="/officer/investigations"
            className="inline-flex h-7 w-fit items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Back to Investigations
          </Link>
        </div>
      </div>
    );
  }

  const executeAction = execute;

  // Mutations follow the active mode: demo store or the authorized live
  // pipeline (server-side RBAC/jurisdiction). No demo fallback in live mode.
  const live = mode === "live";

  return (
    <InvestigationDetailView
      detail={detail}
      onAddNote={(body) =>
        executeAction(() =>
          live
            ? addInvestigationNoteLive(detail.id, body)
            : addInvestigationNote(detail.id, body),
        )
      }
      onAssign={(team) =>
        executeAction(() =>
          live
            ? setInvestigationAssignedToLive(detail.id, team)
            : setInvestigationAssignedTo(detail.id, team),
        )
      }
      onEscalate={() =>
        executeAction(() =>
          live
            ? setInvestigationStatusLive(detail.id, "escalated")
            : setInvestigationStatus(detail.id, "escalated"),
        )
      }
      onMonitor={() =>
        executeAction(() =>
          live
            ? setInvestigationStatusLive(detail.id, "monitoring")
            : setInvestigationStatus(detail.id, "monitoring"),
        )
      }
      onClose={() =>
        executeAction(() =>
          live
            ? setInvestigationStatusLive(detail.id, "closed")
            : setInvestigationStatus(detail.id, "closed"),
        )
      }
    />
  );
}