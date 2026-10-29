"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { MailCheck, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OTPVerificationProps {
  pendingId: string;
  email: string;
  purpose?: "email_verification" | "password_reset";
  onVerified?: (email: string) => void;
}

export function OTPVerification({
  pendingId,
  email,
  purpose = "email_verification",
  onVerified,
}: OTPVerificationProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const expired = timeLeft === 0;

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
  const inputsRef = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));

  // Re-arm after each tick, including a successful resend after expiry.
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < 5) {
      setFocusedIndex(index + 1);
      inputsRef.current[index + 1]?.focus();
    } else if (!value && index > 0) {
      setFocusedIndex(index - 1);
      inputsRef.current[index - 1]?.focus();
    }
    setError(null);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      setFocusedIndex(index - 1);
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      setFocusedIndex(index - 1);
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      setFocusedIndex(index + 1);
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newDigits = pasted.split("").concat(Array(6 - pasted.length).fill(""));
    setDigits(newDigits);
    setFocusedIndex(Math.min(pasted.length, 5));
    if (pasted.length > 0) {
      inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }
    setError(null);
  };

  const otp = digits.join("");

  const triggerShake = useCallback(() => {
    setShakeTrigger((prev) => prev + 1);
  }, []);

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      triggerShake();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId, otp, purpose }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed.");
        triggerShake();
        return;
      }
      setSuccess(true);
      if (onVerified) onVerified(data.email);
      else {
        setTimeout(() => {
          window.location.href = purpose === "email_verification" ? "/onboarding" : "/auth";
        }, 1500);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId, purpose }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend code.");
        return;
      }
      setDigits(Array(6).fill(""));
      setFocusedIndex(0);
      setTimeLeft(120);
      inputsRef.current[0]?.focus();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (success) {
    return (
      <div className="ap-verify-success" role="status" aria-live="polite">
        <span className="ap-auth-state-icon">
          <MailCheck aria-hidden="true" size={48} />
        </span>
        <div className="ap-auth-heading">
          <h1>Email verified!</h1>
          <p>Welcome to AfyaPulse. Redirecting...</p>
        </div>
        <Loader2 className="ap-spinner" size={24} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="ap-verify-page">
      <span className="ap-auth-state-icon">
        <MailCheck aria-hidden="true" />
      </span>
      <div className="ap-auth-heading">
        <h1>Verify your email</h1>
        <p>
          We sent a 6-digit code to <strong>{maskedEmail}</strong>.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="ap-otp-form">
        <div className="ap-otp-inputs" role="group" aria-label="6-digit verification code">
          {digits.map((digit, i) => (
            <Input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={() => setFocusedIndex(i)}
              autoComplete="one-time-code"
              aria-label={`Digit ${i + 1}`}
              className={`ap-otp-input ${focusedIndex === i ? "focused" : ""} ${digit ? "filled" : ""} ${shakeTrigger > 0 && error ? "shake" : ""}`}
              disabled={loading}
              aria-invalid={shakeTrigger > 0 && error ? "true" : "false"}
            />
          ))}
        </div>

        {error && (
          <div className="ap-otp-error" role="alert">
            <AlertCircle className="size-4" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="ap-verify-timer-row">
          {!expired ? (
            <span className="ap-timer" aria-live="polite">
              Code expires in {formatTime(timeLeft)}
            </span>
          ) : (
            <>
              <span className="ap-timer ap-timer--expired">Code expired.</span>
              <Button
                type="button"
                variant="outline"
                className="ap-resend-btn"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  "Resend code"
                )}
              </Button>
            </>
          )}
        </div>

        <Button
          type="submit"
          className="ap-button ap-button-primary w-full"
          disabled={loading || otp.length !== 6}
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Verify"}
        </Button>
      </form>

      <Link href="/auth" className="ap-auth-return">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to sign in
      </Link>
    </div>
  );
}
