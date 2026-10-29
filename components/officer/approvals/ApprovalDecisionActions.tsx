import { TriangleAlert } from "lucide-react";
import { cn } from "@/server/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AccessRequest } from "@/lib/services/officer/access-approvals";

interface Props {
  request: AccessRequest;
  /** Backend-provided approval capability — never derived in the UI. */
  canApprove: boolean;
  busy: boolean;
  rejecting: boolean;
  rejectReason: string;
  decisionError: string | null;
  onRejectReasonChange: (value: string) => void;
  onApprove: () => void;
  /** Opens the rejection-reason view. */
  onStartReject: () => void;
  /** Submits the rejection with the entered reason. */
  onConfirmReject: () => void;
  onCancelReject: () => void;
}

/**
 * Approve / Reject controls for a pending access request. Renders as a
 * confirmation ("Reject") view with a required reason field when rejecting.
 * Never shown without the backend-provided approval capability, and never for
 * a request that has already been decided. The decision itself is delegated to
 * the service boundary — no authorization decision is made here.
 */
export function ApprovalDecisionActions({
  request,
  canApprove,
  busy,
  rejecting,
  rejectReason,
  decisionError,
  onRejectReasonChange,
  onApprove,
  onStartReject,
  onConfirmReject,
  onCancelReject,
}: Props) {
  if (!canApprove || request.status !== "pending") {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {rejecting ? (
        <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-danger-red/30 bg-danger-red/5 p-3">
          <Label htmlFor="rejection-reason" className="text-xs font-semibold text-danger-red">
            Rejection reason (required)
          </Label>
          <textarea
            id="rejection-reason"
            value={rejectReason}
            onChange={(event) => onRejectReasonChange(event.target.value)}
            rows={3}
            aria-invalid={decisionError !== null}
            className={cn(
              "min-h-20 w-full min-w-0 resize-y rounded-lg border border-input bg-white px-2.5 py-1.5 text-sm transition-colors outline-none",
              "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            )}
            placeholder="Explain why this request is being declined…"
          />
          <p className="text-[11px] text-muted-foreground">
            The reason is stored with the decision and shown on the request.
          </p>
          {decisionError ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-danger-red">
              <TriangleAlert className="size-3.5 flex-none" aria-hidden="true" />
              {decisionError}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelReject}
              disabled={busy}
              type="button"
            >
              Back
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onConfirmReject}
              disabled={busy}
              type="button"
            >
              {busy ? "Rejecting…" : "Confirm rejection"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {decisionError ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-danger-red">
              <TriangleAlert className="size-3.5 flex-none" aria-hidden="true" />
              {decisionError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onStartReject}
              disabled={busy}
              type="button"
            >
              Reject
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onApprove}
              disabled={busy}
              type="button"
            >
              {busy ? "Approving…" : "Approve"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}