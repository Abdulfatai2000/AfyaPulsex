import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "cn";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface VerificationStage {
  key: string;
  label: string;
  status: "verified" | "pending" | "rejected";
  timestamp: string | null;
}

// TODO(DEV3): replace with a real fetch from the officer-access-request
// service. This mock data exists only until that endpoint is available.
const stages: VerificationStage[] = [
  {
    key: "identity",
    label: "Identity Verification",
    status: "verified",
    timestamp: "Sep 14, 2026, 10:21 AM",
  },
  {
    key: "organisation",
    label: "Organisation Verification",
    status: "verified",
    timestamp: "Sep 14, 2026, 10:40 AM",
  },
  {
    key: "jurisdiction",
    label: "Jurisdiction Confirmation",
    status: "verified",
    timestamp: "Sep 15, 2026, 09:12 AM",
  },
  {
    key: "awaiting",
    label: "Awaiting Approval",
    status: "pending",
    timestamp: null,
  },
  {
    key: "activation",
    label: "Final Activation",
    status: "pending",
    timestamp: null,
  },
];

// TODO(DEV3): replace with real applicant/request data from the
// authenticated officer-access-request record.
const requestDetails = {
  name: "Dr. Adebayo Yusuf",
  role: "LGA Health Officer",
  jurisdiction: "Ife Central LGA",
  organisation: "Ife Central LGA PHC",
  submittedDate: "Sep 14, 2026",
};

const overallStatus: "rejected" | "approved" | "pending" = stages.some(
  (s) => s.status === "rejected"
)
  ? "rejected"
  : stages.every((s) => s.status === "verified")
    ? "approved"
    : "pending";

const overallStatusConfig = {
  rejected: {
    label: "Rejected",
    className: "bg-danger-red/10 text-danger-red",
  },
  approved: {
    label: "Approved",
    className: "bg-success-green/10 text-success-green",
  },
  pending: {
    label: "Pending Approval",
    className: "bg-warning-amber/10 text-warning-amber",
  },
} as const;

const stageIconConfig = {
  verified: { Icon: CheckCircle2, className: "text-success-green" },
  pending: { Icon: Clock, className: "text-warning-amber" },
  rejected: { Icon: XCircle, className: "text-danger-red" },
} as const;

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-deep-navy">{value}</span>
    </div>
  );
}

function StatusTag({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        className
      )}
    >
      {label}
    </span>
  );
}

export function VerificationStatus() {
  const badge = overallStatusConfig[overallStatus];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Account Verification</CardTitle>
              <StatusTag label={badge.label} className={badge.className} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your request is under review. You will be notified once a
              decision is made.
            </p>
            <div className="space-y-4">
              {stages.map((stage) => {
                const { Icon, className } = stageIconConfig[stage.status];
                return (
                  <div key={stage.key} className="flex items-start gap-3">
                    <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", className)} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-deep-navy">
                          {stage.label}
                        </span>
                        <StatusTag
                          label={
                            stage.status === "verified"
                              ? "Verified"
                              : stage.status === "pending"
                                ? "Pending"
                                : "Rejected"
                          }
                          className={cn(
                            stage.status === "verified" &&
                              "bg-success-green/10 text-success-green",
                            stage.status === "pending" &&
                              "bg-warning-amber/10 text-warning-amber",
                            stage.status === "rejected" &&
                              "bg-danger-red/10 text-danger-red"
                          )}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {stage.timestamp ?? "Pending"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewItem label="Name" value={requestDetails.name} />
            <ReviewItem label="Role" value={requestDetails.role} />
            <ReviewItem
              label="Jurisdiction"
              value={requestDetails.jurisdiction}
            />
            <ReviewItem
              label="Organisation"
              value={requestDetails.organisation}
            />
            <ReviewItem
              label="Submitted date"
              value={requestDetails.submittedDate}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Chain</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <li className="flex items-center justify-between border-b py-2">
              <span className="text-sm text-deep-navy">
                1. State Supervisor (Osun State)
              </span>
              <StatusTag
                label="Pending"
                className="bg-warning-amber/10 text-warning-amber"
              />
            </li>
            <li className="flex items-center justify-between border-b py-2">
              <span className="text-sm text-deep-navy">
                2. Regional / Zonal (if configured)
              </span>
              <StatusTag
                label="Not required"
                className="bg-muted text-muted-foreground"
              />
            </li>
            <li className="flex items-center justify-between py-2">
              <span className="text-sm text-deep-navy">
                3. National (if required)
              </span>
              <StatusTag
                label="Not required"
                className="bg-muted text-muted-foreground"
              />
            </li>
          </ol>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-white p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary-blue" />
        <p className="text-sm text-muted-foreground">
          You will receive a notification once your request is reviewed.
        </p>
      </div>
    </div>
  );
}
