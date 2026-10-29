"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";

import { TryDemoButton } from "./TryDemoButton";
import { AuthField } from "./AuthField";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { TermsPrivacyModal } from "@/components/shared/TermsPrivacyModal";

export function CitizenAuthOptions({
  initialMode = "signin",
  officerEntry = false,
}: {
  initialMode?: "signin" | "signup";
  officerEntry?: boolean;
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  // Field-specific errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Shake triggers for each field
  const [emailShake, setEmailShake] = useState(0);
  const [passwordShake, setPasswordShake] = useState(0);
  const [fullNameShake, setFullNameShake] = useState(0);

  const busy = useRef(false);
  const router = useRouter();

  const signup = !officerEntry && mode === "signup";

  function clearFieldError(field: "email" | "password" | "fullName" | "terms") {
    if (field === "email") setEmailError(null);
    if (field === "password") setPasswordError(null);
    if (field === "fullName") setFullNameError(null);
    if (field === "terms") setTermsError(null);
  }

  function triggerShake(field: "email" | "password" | "fullName") {
    if (field === "email") setEmailShake((prev) => prev + 1);
    if (field === "password") setPasswordShake((prev) => prev + 1);
    if (field === "fullName") setFullNameShake((prev) => prev + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || busy.current) return;

    // Clear general error on new submission
    setGeneralError("");

    busy.current = true;
    setSubmitting(true);

    try {
      if (!email.trim() || !password.trim()) {
        if (!email.trim()) {
          setEmailError("Please enter your email address.");
          triggerShake("email");
        }
        if (!password.trim()) {
          setPasswordError("Please enter your password.");
          triggerShake("password");
        }
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setEmailError("Please enter a valid email address.");
        triggerShake("email");
        return;
      }

      if (signup && !accountCreated) {
        if (
          fullName.trim().length < 5 ||
          fullName.trim().split(/\s+/).length < 2
        ) {
          setFullNameError("Please enter your full name (first and last).");
          triggerShake("fullName");
          return;
        }

        if (password.trim().length < 8) {
          setPasswordError("Password must be at least 8 characters long.");
          triggerShake("password");
          return;
        }

        // Check terms acceptance
        const termsChecked = (event.target as HTMLFormElement).acknowledgement?.checked;
        if (!termsChecked) {
          setTermsError("You must acknowledge the Terms of Use & Privacy Notice.");
          return;
        }

        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim(),
            password: password.trim(),
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (result.error?.includes("already exists")) {
            setEmailError("An account with this email already exists. Sign in instead.");
            triggerShake("email");
          } else if (result.error?.includes("Invalid email")) {
            setEmailError("Please enter a valid email address.");
            triggerShake("email");
          } else {
            setGeneralError(result.error || "We could not create your account. Please try again.");
          }
          return;
        }

        // Redirect to email verification page after pending registration created
        router.replace(`/auth/verify-email?pendingId=${result.pendingId}&email=${encodeURIComponent(result.email)}`);
        router.refresh();
        return;
      }

      const result = await signIn("credentials", {
        email: email.trim(),
        password: password.trim(),
        redirect: false,
      });

      if (!result?.ok || result.error) {
        setGeneralError(
          result?.code === "auth_unavailable" ||
            result?.error !== "CredentialsSignin"
            ? "Account access is temporarily unavailable. Please try again shortly."
            : "Invalid email or password. Please try again.",
        );
        // For sign in, we don't reveal which field is wrong
        triggerShake("email");
        triggerShake("password");
        return;
      }

      const response = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      const session = await response.json();

      if (!response.ok || !session?.user?.id) {
        setGeneralError("Your session could not be established. Please try signing in again.");
        return;
      }

      // The destination's server guard checks current email verification and
      // onboarding completion in MongoDB, never stale client/session flags.
      let destination = signup ? "/onboarding" : "/dashboard";

      if (officerEntry || session.user.role === "officer") {
        const statusResponse = await fetch("/api/officer/profile-status", {
          cache: "no-store",
        });

        const status = await statusResponse.json();

        if (!statusResponse.ok && statusResponse.status !== 404) {
          setGeneralError("We could not verify your officer access. Please try again.");
          return;
        }

        destination = status.canAccess
          ? "/officer/overview"
          : status.status === "none"
            ? "/officer/access-request"
            : "/officer/verification";
      }

      router.replace(destination);
      router.refresh();
    } catch {
      setGeneralError("Account access is temporarily unavailable. Please try again shortly.");
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="ap-auth-heading">
        <span className="ap-auth-kicker">
          {officerEntry
            ? "PUBLIC HEALTH OFFICER ACCESS"
            : "WELCOME TO AFYAPULSE"}
        </span>

        <h1>
          {officerEntry
            ? "Welcome back, officer."
            : signup
              ? "Start your health story."
              : "Welcome back."}
        </h1>

        <p>
          {signup
            ? "A little more insight into your health starts here."
            : "Your next step toward better health awareness."}
        </p>
      </div>

      {!officerEntry && (
        <div
          className="ap-auth-modes"
          role="group"
          aria-label="Account access mode"
        >
          <button
            type="button"
            disabled={submitting}
            aria-pressed={!signup}
            onClick={() => {
              setAccountCreated(false);
              setMode("signin");
              setEmailError(null);
              setPasswordError(null);
              setFullNameError(null);
              setTermsError(null);
              setGeneralError("");
            }}
            className="cursor-pointer"
          >
            Sign In
          </button>

          <button
            type="button"
            disabled={submitting}
            aria-pressed={signup}
            onClick={() => {
              setAccountCreated(false);
              setMode("signup");
              setEmailError(null);
              setPasswordError(null);
              setFullNameError(null);
              setTermsError(null);
              setGeneralError("");
            }}
            className="cursor-pointer"
          >
            Create Account
          </button>
        </div>
      )}

      {officerEntry && (
        <p className="ap-officer-note">
          <ShieldCheck aria-hidden="true" className="size-5 shrink-0" />
          For verified officers. Access is granted through the officer approval
          process.
        </p>
      )}

      <form
        key={signup ? "signup" : "signin"}
        onSubmit={submit}
        className="ap-auth-form"
        aria-label={
          signup
            ? "Create citizen account"
            : officerEntry
              ? "Health Officer sign in"
              : "Citizen sign in"
        }
      >
        {signup && (
          <AuthField
            id="full-name"
            label="Full Name"
            autoComplete="name"
            placeholder="Your full name"
            onChange={(e) => {
              setFullName(e.target.value);
              clearFieldError("fullName");
            }}
            error={fullNameError}
            shakeTrigger={fullNameShake}
          />
        )}

        <AuthField
          id="email"
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError("email");
          }}
          error={emailError}
          shakeTrigger={emailShake}
        />

        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder={signup ? "Choose a password" : "Enter your password"}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError("password");
          }}
          error={passwordError}
          shakeTrigger={passwordShake}
        />

        {signup ? (
          <>
            <TermsPrivacyModal
              trigger={(openModal) => (
                <label
                  className={`ap-checkbox-label ${termsError ? "ap-checkbox-label--error" : ""}`}
                >
                  <input
                    type="checkbox"
                    required
                    name="acknowledgement"
                    aria-invalid={termsError ? true : undefined}
                    aria-describedby={termsError ? "signup-terms-error" : undefined}
                    onChange={() => clearFieldError("terms")}
                  />{" "}
                  <span>
                    I acknowledge the{" "}
                    <button
                      type="button"
                      className="ap-terms-link"
                      onClick={(e) => {
                        e.preventDefault();
                        openModal();
                      }}
                    >
                      Terms of Use &amp; Privacy Notice
                    </button>
                    .
                  </span>
                </label>
              )}
            />
            {termsError && (
              <div id="signup-terms-error" className="ap-field-error" role="alert">
                <span>{termsError}</span>
              </div>
            )}
          </>
        ) : (
          <div className="ap-form-options">
            <label className="ap-checkbox-label">
              <input type="checkbox" name="remember" />
              <span>Remember me</span>
            </label>

            <Link href="/auth/forgot-password">Forgot password?</Link>
          </div>
        )}

        {!signup && <TryDemoButton role={officerEntry ? "officer" : "citizen"} />}

        <Button
          type="submit"
          className="ap-button ap-button-primary w-full"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              {signup ? "Creating Account..." : "Signing In..."}
            </>
          ) : (
            <>
              {signup ? "Create Account" : "Sign In"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </Button>

        {generalError && (
          <p
            className="ap-form-notice ap-form-notice--error"
            role="status"
            aria-live="polite"
          >
            {generalError}
          </p>
        )}
      </form>

      {officerEntry && (
        <Link href="/auth" className="ap-auth-return">
          Back to citizen sign in
        </Link>
      )}
    </>
  );
}
