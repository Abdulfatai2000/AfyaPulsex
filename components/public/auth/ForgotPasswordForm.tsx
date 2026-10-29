"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthField } from "./AuthField";
export function ForgotPasswordForm() {
  const [notice, setNotice] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO(DEV4): connect secure password reset; use an account-enumeration-safe response.
    setNotice("Password reset is not available yet. No email has been sent.");
  }
  return (
    <>
      <span className="ap-auth-state-icon">
        <KeyRound aria-hidden="true" />
      </span>
      <div className="ap-auth-heading">
        <h1>Forgot your password?</h1>
        <p>
          It happens. Once account access is available, you can request a secure
          reset link here.
        </p>
      </div>
      <form
        onSubmit={submit}
        className="ap-auth-form"
        aria-label="Password reset"
      >
        <AuthField
          id="reset-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Button type="submit" className="ap-button ap-button-primary w-full">
          Request reset link{" "}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
        <p className="ap-auth-availability">
          Password reset is coming soon. Your email is not sent or saved.
        </p>
        <p role="status" className="ap-form-notice">
          {notice}
        </p>
      </form>
      <Link href="/auth" className="ap-auth-return">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to sign in
      </Link>
    </>
  );
}
