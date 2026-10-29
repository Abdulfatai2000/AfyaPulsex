"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { SessionExpiredState } from "@/components/feedback/SessionExpiredState";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type {
  AccessRequest,
  AccessRequestsCounts,
  ApprovalPermissions,
  ApprovalsTab,
} from "@/lib/services/officer/access-approvals";
import {
  APPROVAL_TABS,
  ApprovalsServiceError,
  approveAccessRequest,
  describeApprovalAuthority,
  deriveApprovalsStatus,
  getAccessRequest,
  getAccessRequests,
  rejectAccessRequest,
} from "@/lib/services/officer/access-approvals";
import { ApprovalTabs } from "./ApprovalTabs";
import { ApprovalTable } from "./ApprovalTable";
import { ApprovalReview } from "./ApprovalReview";
import { ApprovalDecisionActions } from "./ApprovalDecisionActions";

const VALID_TABS: ReadonlyArray<ApprovalsTab> = APPROVAL_TABS.map(
  (tab) => tab.value,
);

function mapTabParam(value: string | null): ApprovalsTab {
  return VALID_TABS.includes(value as ApprovalsTab)
    ? (value as ApprovalsTab)
    : "pending";
}

const TAB_EMPTY: Record<ApprovalsTab, { title: string; description: string }> = {
  pending: {
    title: "No pending access requests",
    description:
      "Requests awaiting a decision will appear here once submitted.",
  },
  approved: {
    title: "No approved access requests",
    description:
      "Approved requests will appear here with their final status and history.",
  },
  rejected: {
    title: "No rejected access requests",
    description:
      "Rejected requests will appear here, with the reason where provided.",
  },
};

function ApprovalsListSkeleton() {
  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white"
      aria-busy="true"
      aria-label="Loading access approval requests"
    >
      <div className="hidden gap-6 border-b border-gray-100 px-4 py-3 sm:flex">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-3 w-24" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-6"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function ApprovalsState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-6 py-12 text-center">
      {icon}
      <p className="text-sm font-semibold text-deep-navy">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

interface Props {
  /** Backend-provided approval capability for the current officer session. */
  initialPermissions: ApprovalPermissions;
}

export default function ApprovalsCenterClient({ initialPermissions }: Props) {
  const searchParams = useSearchParams();
  const requestedTab = mapTabParam(searchParams.get("tab"));

  const [tab, setTab] = useState<ApprovalsTab>(requestedTab);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [counts, setCounts] = useState<AccessRequestsCounts | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<
    "loading" | "ready" | "empty" | "session-expired" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [scopeNote, setScopeNote] = useState<string | null>(null);

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<AccessRequest | null>(null);
  const [reviewStatus, setReviewStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);

  // Initial + tab/page/reload-driven list fetch. State updates happen inside
  // async callbacks, never in the effect body; stale responses are dropped.
  useEffect(() => {
    let cancelled = false;
    getAccessRequests({ status: tab, page, limit: 10 })
      .then((data) => {
        if (cancelled) {
          return;
        }
        setRequests(data.items);
        setCounts(data.counts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setStatus(deriveApprovalsStatus(data.items.length));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        if (err instanceof ApprovalsServiceError && err.code === "unauthorized") {
          setStatus("session-expired");
        } else {
          setStatus("error");
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong loading access requests.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, page, reloadKey]);

  // Proof of authority, resolved through the shared geography service.
  useEffect(() => {
    let cancelled = false;
    describeApprovalAuthority(initialPermissions)
      .then((note) => {
        if (!cancelled) {
          setScopeNote(note);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setScopeNote(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialPermissions]);

  const handleTabChange = (next: ApprovalsTab) => {
    if (next === tab) {
      return;
    }
    setStatus("loading");
    setTab(next);
    setPage(1);
    setDecisionError(null);
    setDecisionSuccess(null);
  };

  const handleRetry = () => {
    setStatus("loading");
    setError(null);
    setReloadKey((value) => value + 1);
  };

  const reloadList = () => {
    setStatus("loading");
    setError(null);
    setReloadKey((value) => value + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setStatus("loading");
      setPage((value) => value - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setStatus("loading");
      setPage((value) => value + 1);
    }
  };

  // Review flow — loads the SELECTED request by id, never a hardcoded target.
  const handleOpenReview = (request: AccessRequest) => {
    setReviewingId(request.id);
    setReviewData(null);
    setReviewStatus("loading");
    setRejecting(false);
    setRejectReason("");
    setDecisionError(null);
    void getAccessRequest(request.id)
      .then((detail) => {
        setReviewData(detail);
        setReviewStatus("ready");
      })
      .catch(() => {
        setReviewStatus("error");
      });
  };

  const handleCloseReview = () => {
    setReviewingId(null);
    setReviewData(null);
    setReviewStatus("loading");
    setRejecting(false);
    setRejectReason("");
    setDecisionError(null);
  };

  const finishDecision = (message: string) => {
    const applicant = reviewData?.applicantName ?? "";
    setBusy(false);
    setDecisionSuccess(`${message}${applicant ? ` — ${applicant}` : ""}.`);
    handleCloseReview();
    reloadList();
  };

  const handleApprove = () => {
    if (!reviewData || busy) {
      return;
    }
    setBusy(true);
    setDecisionError(null);
    approveAccessRequest(reviewData.id)
      .then(() => finishDecision("Request approved"))
      .catch((err: unknown) => {
        setBusy(false);
        setDecisionError(
          err instanceof Error
            ? err.message
            : "The request could not be approved. Please try again.",
        );
      });
  };

  const handleReject = () => {
    if (!reviewData || busy) {
      return;
    }
    if (!rejectReason.trim()) {
      setDecisionError("A rejection reason is required.");
      return;
    }
    setBusy(true);
    setDecisionError(null);
    rejectAccessRequest(reviewData.id, rejectReason)
      .then(() => finishDecision("Request rejected"))
      .catch((err: unknown) => {
        setBusy(false);
        setDecisionError(
          err instanceof Error
            ? err.message
            : "The request could not be rejected. Please try again.",
        );
      });
  };

  // ------------------------------------------------------------------
  // Authorized? The frontend only branches on the backend-provided object.
  // ------------------------------------------------------------------
  if (!initialPermissions.canApprove) {
    return (
      <ApprovalsState
        icon={<ShieldX className="h-5 w-5 text-danger-red" aria-hidden="true" />}
        title="You don't have permission to approve access requests."
        description="Your account can use AfyaPulse, but approval authority is granted separately with its own scope and jurisdictions. Backend authorization remains authoritative — contact your administrator if you should have approval rights."
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {decisionSuccess ? (
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-success-green/30 bg-success-green/10 px-3 py-2.5 text-xs font-medium text-success-green"
        >
          <CheckCircle2 className="size-4 flex-none" aria-hidden="true" />
          {decisionSuccess}
        </p>
      ) : null}

      {scopeNote ? (
        <div
          role="note"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[11px] text-muted-foreground"
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary-blue" aria-hidden="true" />
          <span>
            Approval authority: {scopeNote}. You can act only on requests inside
            your authorized jurisdiction.
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ApprovalTabs value={tab} onChange={handleTabChange} counts={counts} />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          type="button"
          aria-label="Refresh access requests"
        >
          <RefreshCw aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {status === "loading" ? (
        <ApprovalsListSkeleton />
      ) : status === "session-expired" ? (
        <SessionExpiredState title="Your session has expired" />
      ) : status === "error" ? (
        <ApprovalsState
          icon={<TriangleAlert className="h-5 w-5 text-danger-red" aria-hidden="true" />}
          title="Unable to load access requests"
          description={
            error ?? "The access requests could not be loaded. Please try again."
          }
          action={
            <Button variant="outline" size="sm" onClick={handleRetry} type="button">
              Retry
            </Button>
          }
        />
      ) : status === "empty" ? (
        <EmptyState
          className="w-full"
          title={TAB_EMPTY[tab].title}
          description={TAB_EMPTY[tab].description}
        />
      ) : (
        <>
          <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
            {total} access request{total === 1 ? "" : "s"}
            {tab === "pending" && total > 0 ? " awaiting your decision" : ""}
          </p>

          <ApprovalTable
            requests={requests}
            actionLabel={tab === "pending" ? "Review" : "View"}
            onOpen={handleOpenReview}
          />

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={page <= 1}
                  type="button"
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                  type="button"
                >
                  Next
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}

          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-2.5 text-[11px] text-muted-foreground"
            role="note"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden="true" />
            <span>
              Access requests show officer profiles and requested organizational
              access only — never citizen information. Decisions are recorded
              through the service boundary; backend authorization is
              authoritative.
            </span>
          </div>
        </>
      )}

      <Dialog
        open={reviewingId !== null}
        onOpenChange={(next) => {
          if (!next) {
            handleCloseReview();
          }
        }}
      >
        {reviewingId !== null ? (
          <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-lg">
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2">
                Review access request
                {reviewData ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    {reviewData.id}
                  </span>
                ) : null}
              </DialogTitle>
              <DialogDescription>
                Details are loaded for the selected request only.
              </DialogDescription>
            </DialogHeader>

            {reviewStatus === "loading" ? (
              <div
                className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/70 p-4"
                aria-busy="true"
                aria-label="Loading request details"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-4 w-full rounded" />
                ))}
              </div>
            ) : reviewStatus === "error" ? (
              <ApprovalsState
                icon={<TriangleAlert className="h-5 w-5 text-danger-red" aria-hidden="true" />}
                title="Unable to load this request"
                description="The request details could not be loaded. Please close and reopen it."
              />
            ) : reviewData ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ApprovalReview request={reviewData} />
                </div>
                <div className="shrink-0 border-t border-gray-100 pt-3">
                  <ApprovalDecisionActions
                    request={reviewData}
                    canApprove={initialPermissions.canApprove}
                    busy={busy}
                    rejecting={rejecting}
                    rejectReason={rejectReason}
                    decisionError={decisionError}
                    onRejectReasonChange={setRejectReason}
                    onApprove={handleApprove}
                    onStartReject={() => setRejecting(true)}
                    onConfirmReject={handleReject}
                    onCancelReject={() => {
                      setRejecting(false);
                      setRejectReason("");
                      setDecisionError(null);
                    }}
                  />
                </div>
              </>
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}