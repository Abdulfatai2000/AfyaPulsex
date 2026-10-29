"use client";
import Link from "next/link";
import { useState } from "react";
import { MailCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
export function EmailVerificationStatus() {
  const [notice, setNotice] = useState("");
  // TODO(DEV4): render verified/pending/invalid/expired state from the server.
  // TODO(DEV4): wire resend with throttling. Never imply delivery or verification here.
  return (
    <>
      <span className="ap-auth-state-icon">
        <MailCheck aria-hidden="true" />
      </span>
      <div className="ap-auth-heading">
        <h1>Verify your email.</h1>
        <p>
          Email verification helps protect your account. When registration
          opens, a secure link will let you confirm your email address.
        </p>
      </div>
      <div className="ap-verification-note">
        <strong>Verification is not available yet</strong>
        <p>
          No verification email has been sent from this page. An account is not
          verified by visiting this screen.
        </p>
      </div>
      <Button
        type="button"
        className="ap-button ap-button-primary w-full"
        onClick={() =>
          setNotice("Resending is not available yet. No email has been sent.")
        }
      >
        Resend verification email
      </Button>
      <p role="status" className="ap-form-notice">
        {notice}
      </p>
      <Link href="/auth" className="ap-auth-return">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to sign in
      </Link>
    </>
  );
}
