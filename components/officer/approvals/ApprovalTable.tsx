import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AccessRequest } from "@/lib/services/officer/access-approvals";
import { ApprovalStatus } from "./ApprovalStatus";

function formatSubmitted(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  requests: AccessRequest[];
  /** "Review" for pending decisions, "View" for decided requests. */
  actionLabel: "Review" | "View";
  onOpen: (request: AccessRequest) => void;
}

/**
 * Access-approval queue table (desktop) + cards (mobile). Presentational —
 * the client owns loading, empty/error/state handling and the review flow.
 * Every row opens ITS OWN request via `getAccessRequest(id)` — never a hardcoded
 * target. Only requests within the authorized scope are shown, because that is
 * all the service returns.
 */
export function ApprovalTable({ requests, actionLabel, onOpen }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="hidden min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm lg:block">
        <Table aria-label="Access approval requests">
          <TableCaption className="sr-only">
            Access approval requests with applicant name, requested role,
            jurisdiction, submission date, and current status. Organization
            access data only.
          </TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Requested Role
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Jurisdiction
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Submitted
              </TableHead>
              <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow
                key={request.id}
                className="align-middle transition-colors hover:bg-gray-50/70"
              >
                <TableCell className="py-3 pl-4">
                  <span className="text-sm font-medium text-deep-navy">
                    {request.applicantName}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 pr-3 text-sm text-gray-600">
                  {request.roleLabel}
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 pr-3 text-sm text-gray-600">
                  {request.jurisdictionLabel}
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 pr-3 text-xs text-muted-foreground">
                  {formatSubmitted(request.submittedAt)}
                </TableCell>
                <TableCell className="py-3 pr-3">
                  <ApprovalStatus status={request.status} />
                </TableCell>
                <TableCell className="py-3 pr-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpen(request)}
                    type="button"
                    aria-label={`${actionLabel} ${request.applicantName}'s request`}
                  >
                    {actionLabel}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul
        className="flex min-w-0 flex-col gap-3 lg:hidden"
        aria-label="Access approval requests"
      >
        {requests.map((request) => (
          <li
            key={request.id}
            className="min-w-0 rounded-xl border border-border bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-deep-navy">
                  {request.applicantName}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {request.roleLabel} · {request.jurisdictionLabel}
                </p>
              </div>
              <ApprovalStatus status={request.status} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Submitted {formatSubmitted(request.submittedAt)}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpen(request)}
                type="button"
                aria-label={`${actionLabel} ${request.applicantName}'s request`}
              >
                {actionLabel}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}