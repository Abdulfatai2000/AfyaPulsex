"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "cn";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface VerificationStage {
  key: string;
  label: string;
  status: "verified" | "pending" | "rejected";
  timestamp: string | null;
}

interface AccessRequestStatus {
  id: string;
  status: "pending" | "approved" | "denied";
  submittedAt: string;
  decidedAt: string | null;
  justification: string;
}

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

export function VerificationStatusClient() {
  const [request, setRequest] = useState<AccessRequestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequest() {
      try {
        const response = await fetch("/api/officer/my-access-request");
        if (response.ok) {
          const data = await response.json();
          setRequest(data);
        } else if (response.status === 404) {
          setRequest(null);
        } else {
          setError("Failed to load request status");
        }
      } catch {
        setError("Failed to load request status");
      } finally {
        setLoading(false);
      }
    }
    fetchRequest();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Account Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex min-h-[200px] items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading&hellip;</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[200px] items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading&hellip;</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-danger-red" />
            <h3 className="text-lg font-semibold text-deep-navy">Unable to load status</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link href="/auth?entry=officer">
              <Button variant="outline">Return to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-primary-blue" />
            <h3 className="text-lg font-semibold text-deep-navy">No access request found</h3>
            <p className="text-sm text-muted-foreground">
              You do not have a pending or previous access request.{" "}
              <Link href="/officer/access-request" className="underline">
                Submit a new request
              </Link>
            </p>
            <Link href="/auth?entry=officer">
              <Button variant="outline">Return to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stages: VerificationStage[] = [
    {
      key: "submitted",
      label: "Request Submitted",
      status: "verified",
      timestamp: new Date(request.submittedAt).toLocaleString(),
    },
    {
      key: "identity",
      label: "Identity Verification",
      status: request.status === "pending" ? "pending" : "verified",
      timestamp: request.status === "pending" ? null : new Date(request.decidedAt || request.submittedAt).toLocaleString(),
    },
    {
      key: "organisation",
      label: "Organisation Verification",
      status: request.status === "pending" ? "pending" : "verified",
      timestamp: request.status === "pending" ? null : new Date(request.decidedAt || request.submittedAt).toLocaleString(),
    },
    {
      key: "jurisdiction",
      label: "Jurisdiction Confirmation",
      status: request.status === "pending" ? "pending" : "verified",
      timestamp: request.status === "pending" ? null : new Date(request.decidedAt || request.submittedAt).toLocaleString(),
    },
    {
      key: "awaiting",
      label: "Awaiting Approval",
      status: request.status === "pending" ? "pending" : "verified",
      timestamp: request.status === "pending" ? "Under review" : null,
    },
    {
      key: "activation",
      label: "Final Activation",
      status: request.status === "approved" ? "verified" : request.status === "denied" ? "rejected" : "pending",
      timestamp: request.status === "approved" ? new Date(request.decidedAt || "").toLocaleString() : null,
    },
  ];

  const overallStatus: "rejected" | "approved" | "pending" = request.status === "denied"
    ? "rejected"
    : request.status === "approved"
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

  const badge = overallStatusConfig[overallStatus];

  const parseJustification = (justification: string) => {
    const orgMatch = justification.match(/Organization: ([^,]+)/);
    const lgaMatch = justification.match(/LGA: ([^,]+)/);
    const evidenceMatch = justification.match(/Evidence: ([^,]+)/);
    return {
      organization: orgMatch ? orgMatch[1] : "&mdash;",
      lga: lgaMatch ? lgaMatch[1] : "&mdash;",
      evidence: evidenceMatch ? evidenceMatch[1] : "&mdash;",
    };
  };

  const details = parseJustification(request.justification);

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
              {request.status === "pending"
                ? "Your request is under review. You will be notified once a decision is made."
                : request.status === "approved"
                ? "Your request has been approved. You can now sign in to the Officer Portal."
                : "Your request was not approved. See details below."}
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
            <ReviewItem label="Request ID" value={request.id} />
            <ReviewItem label="Status" value={request.status} />
            <ReviewItem label="Submitted" value={new Date(request.submittedAt).toLocaleString()} />
            <ReviewItem label="Organisation" value={details.organization} />
            <ReviewItem label="LGA" value={details.lga} />
            <ReviewItem label="Evidence" value={details.evidence} />
            {request.decidedAt && (
              <ReviewItem label="Decided" value={new Date(request.decidedAt).toLocaleString()} />
            )}
          </CardContent>
        </Card>
      </div>

      {request.status === "denied" && (
        <Card>
          <CardHeader>
            <CardTitle>Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-danger-red/30 bg-danger-red/5 p-4">
              <p className="text-sm text-danger-red">{request.justification}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-3 rounded-lg border border-border bg-white p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary-blue" />
        <p className="text-sm text-muted-foreground">
          {request.status === "pending"
            ? "You will receive a notification once your request is reviewed."
            : request.status === "approved"
            ? "You can now sign in at the Officer Portal using your credentials."
            : "You may submit a new request if you believe this was an error."}
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/auth?entry=officer">
          <Button variant="outline">Return to Officer Sign In</Button>
        </Link>
        {request.status === "denied" && (
          <Link href="/officer/access-request">
            <Button>Submit New Request</Button>
          </Link>
        )}
        {request.status === "approved" && (
          <Link href="/officer/overview">
            <Button>Go to Officer Dashboard</Button>
          </Link>
        )}
      </div>
    </div>
  );
}