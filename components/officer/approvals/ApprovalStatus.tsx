import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/server/lib/utils";
import type { AccessRequestStatus } from "@/lib/services/officer/access-approvals";

export const APPROVAL_STATUS_META: Record<
  AccessRequestStatus,
  { label: string; Icon: typeof Clock; className: string }
> = {
  pending: {
    label: "Pending",
    Icon: Clock,
    className: "bg-[#D99000]/10 text-[#D99000]",
  },
  approved: {
    label: "Approved",
    Icon: CheckCircle2,
    className: "bg-success-green/10 text-success-green",
  },
  rejected: {
    label: "Rejected",
    Icon: XCircle,
    className: "bg-danger-red/10 text-danger-red",
  },
};

/**
 * Access-request status chip. Always pairs text with an icon so state is never
 * communicated by color alone.
 */
export function ApprovalStatus({ status }: { status: AccessRequestStatus }) {
  const { label, Icon, className } = APPROVAL_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}