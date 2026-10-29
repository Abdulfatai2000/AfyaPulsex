import { ExternalLink, FileText, Image as ImageIcon, ShieldCheck } from "lucide-react";
import type { AccessRequest } from "@/lib/services/officer/access-approvals";
import { getAccessRequestEvidenceUrl } from "@/lib/services/officer/access-approvals";
import { ApprovalStatus } from "./ApprovalStatus";

function formatDate(iso: string | null) {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  /** Full request detail loaded from the service for the selected request. */
  request: AccessRequest;
}

/**
 * Review screen for a single access request: applicant, requested role and
 * jurisdiction, submission date, current status, plus any backend-supplied
 * additional information. Presented inside the review dialog — decision
 * controls live in ApprovalDecisionActions.
 */
export function ApprovalReview({ request }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <dl className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
        <div className="flex min-w-0 items-baseline justify-between gap-4">
          <dt className="min-w-0 text-xs text-muted-foreground">Applicant</dt>
          <dd className="shrink-0 text-sm font-semibold text-deep-navy">
            {request.applicantName}
          </dd>
        </div>
        <div className="flex min-w-0 items-baseline justify-between gap-4">
          <dt className="min-w-0 text-xs text-muted-foreground">Requested role</dt>
          <dd className="shrink-0 text-sm font-medium text-deep-navy">
            {request.roleLabel}
          </dd>
        </div>
        <div className="flex min-w-0 items-baseline justify-between gap-4">
          <dt className="min-w-0 text-xs text-muted-foreground">Jurisdiction</dt>
          <dd className="shrink-0 text-sm font-medium text-deep-navy">
            {request.jurisdictionLabel}
          </dd>
        </div>
        <div className="flex min-w-0 items-baseline justify-between gap-4">
          <dt className="min-w-0 text-xs text-muted-foreground">Submitted</dt>
          <dd className="shrink-0 text-sm font-medium text-deep-navy">
            {formatDate(request.submittedAt)}
          </dd>
        </div>
        <div className="flex min-w-0 items-baseline justify-between gap-4">
          <dt className="min-w-0 text-xs text-muted-foreground">Status</dt>
          <dd className="shrink-0">
            <ApprovalStatus status={request.status} />
          </dd>
        </div>
        {request.decidedAt ? (
          <div className="flex min-w-0 items-baseline justify-between gap-4">
            <dt className="min-w-0 text-xs text-muted-foreground">Decided</dt>
            <dd className="shrink-0 text-sm font-medium text-deep-navy">
              {formatDate(request.decidedAt)}
              {request.decidedByLabel ? ` by ${request.decidedByLabel}` : ""}
            </dd>
          </div>
        ) : null}
        {request.rejectionReason ? (
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Rejection reason</dt>
            <dd className="text-sm text-deep-navy">{request.rejectionReason}</dd>
          </div>
        ) : null}
      </dl>

      {request.additionalInfo ? (
        <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-deep-navy">
            <ShieldCheck className="size-3.5 text-primary-blue" aria-hidden="true" />
            Additional information supplied with the request
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {request.additionalInfo}
          </p>
        </div>
      ) : null}

      <ApprovalEvidence requestId={request.id} evidence={request.evidence} />
    </div>
  );
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "—";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Submitted evidence (Official ID / Letter) for approver review. Images
 * render an inline preview; documents open through the authorized evidence
 * endpoint, which enforces approval authority server-side. Shown before
 * the decision controls so the approver reviews first.
 */
function ApprovalEvidence({
  requestId,
  evidence,
}: {
  requestId: string;
  evidence: AccessRequest["evidence"];
}) {
  if (!evidence) {
    return (
      <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-deep-navy">
          <FileText className="size-3.5 text-primary-blue" aria-hidden="true" />
          Submitted evidence
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          No evidence was submitted with this request.
        </p>
      </div>
    );
  }

  const url = getAccessRequestEvidenceUrl(requestId);
  const isImage = evidence.mimeType.startsWith("image/");

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-deep-navy">
        {isImage ? (
          <ImageIcon className="size-3.5 text-primary-blue" aria-hidden="true" />
        ) : (
          <FileText className="size-3.5 text-primary-blue" aria-hidden="true" />
        )}
        Submitted evidence
      </p>
      <p className="min-w-0 truncate text-sm font-medium text-deep-navy" title={evidence.fileName}>
        {evidence.fileName}
      </p>
      <p className="text-xs text-muted-foreground">
        {evidence.mimeType} · {formatBytes(evidence.size)}
      </p>
      {isImage ? (
        // Authenticated browser request: the session cookie accompanies it,
        // and the endpoint re-checks approval authority server-side.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Submitted evidence for request ${requestId}`}
          className="max-h-80 w-full min-w-0 rounded-lg border border-gray-100 object-contain bg-gray-50"
          loading="lazy"
        />
      ) : null}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary-blue underline underline-offset-2"
      >
        {isImage ? "Open full size" : "Open document"}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}