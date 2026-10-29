"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PendingButton } from "../feedback/CitizenLoading";
import { Field } from "./profile-ui";

/** DEV3/DEV4 integration contract, intentionally not connected to an API.
 * Every method must call the authenticated server. The server must choose the
 * session's account email (never a client-provided recipient), enforce expiry,
 * attempt/resend limits, and bind a single-use reset authorization to that account.
 * update must revalidate that authorization; UI state is never authorization.
 */
export interface PasswordChangeService {
  sendCode(): Promise<{ sent: true; challengeId: string }>;
  verifyCode(
    challengeId: string,
    code: string,
  ): Promise<{ verified: true; authorization: string }>;
  updatePassword(
    authorization: string,
    password: string,
  ): Promise<{ updated: true }>;
}

type Step =
  | { kind: "email" }
  | { kind: "code"; challengeId: string }
  | { kind: "password"; authorization: string }
  | { kind: "done" };

export function PasswordChangeDialog({
  accountEmailMasked,
  service,
}: {
  accountEmailMasked?: string | null;
  service?: PasswordChangeService;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger className="pf-btn pf-btn-secondary">
        Change password <ArrowRight aria-hidden="true" />
      </DialogTrigger>
      <DialogContent
        className="pf-workspace max-h-[85dvh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending}
      >
        {open && (
          <PasswordChangeFlow
            accountEmailMasked={accountEmailMasked}
            service={service}
            onPending={setPending}
            onClose={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PasswordChangeFlow({
  accountEmailMasked,
  service,
  onPending,
  onClose,
}: {
  accountEmailMasked?: string | null;
  service?: PasswordChangeService;
  onPending: (value: boolean) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [pending, setPending] = useState<"send" | "verify" | "update" | null>(
    null,
  );
  const busy = useRef(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const available = !!service && !!accountEmailMasked;

  async function run(action: "send" | "verify" | "update") {
    if (!available || !service || busy.current) return;
    setError("");
    setNotice("");
    if (action === "verify" && !/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your account email.");
      return;
    }
    if (
      action === "update" &&
      (password.trim().length < 8 || password !== confirm)
    ) {
      setError("Use at least 8 characters and make sure both passwords match.");
      return;
    }
    busy.current = true;
    setPending(action);
    onPending(true);
    try {
      if (
        action === "send" &&
        (step.kind === "email" || step.kind === "code")
      ) {
        const result = await service.sendCode();
        if (result.sent !== true || !result.challengeId)
          throw new Error("Unconfirmed send");
        setCode("");
        setStep({ kind: "code", challengeId: result.challengeId });
        setNotice(
          "Verification code requested. Check your account inbox and spam folder.",
        );
      } else if (action === "verify" && step.kind === "code") {
        const result = await service.verifyCode(step.challengeId, code);
        if (result.verified !== true || !result.authorization)
          throw new Error("Unconfirmed verification");
        setCode("");
        setStep({ kind: "password", authorization: result.authorization });
        setNotice("Account email verified. Create your new password.");
      } else if (action === "update" && step.kind === "password") {
        const result = await service.updatePassword(
          step.authorization,
          password,
        );
        if (result.updated !== true) throw new Error("Unconfirmed update");
        setPassword("");
        setConfirm("");
        setStep({ kind: "done" });
      }
    } catch {
      setError(
        action === "send"
          ? "We could not confirm that a code was sent. Try again later."
          : action === "verify"
            ? "We could not verify that code. Check it, or request a new code if it has expired."
            : "We could not confirm the password update. Try again, or cancel and verify your email again if authorization has expired.",
      );
    } finally {
      busy.current = false;
      setPending(null);
      onPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(
      step.kind === "email"
        ? "send"
        : step.kind === "code"
          ? "verify"
          : "update",
    );
  }

  return (
    <>
      <DialogTitle>
        {step.kind === "done"
          ? "Password updated"
          : step.kind === "password"
            ? "Create new password"
            : "Verify your identity"}
      </DialogTitle>
      <DialogDescription>
        {step.kind === "email"
          ? "For your security, we'll send a verification code to your account email."
          : step.kind === "code"
            ? "Enter the six-digit code sent to your account email."
            : step.kind === "password"
              ? "Choose a password with at least 8 characters."
              : "Your password has been updated."}
      </DialogDescription>
      {step.kind !== "done" && (
        <p className="pf-hint break-all">
          Account email:{" "}
          <strong>{accountEmailMasked ?? "Unavailable in this session"}</strong>
        </p>
      )}
      {!available && (
        <div
          className="pf-status pf-status-info"
          id="password-integration"
          role="status"
        >
          Password changes are currently unavailable. No verification email has
          been sent.
        </div>
      )}
      {step.kind !== "done" ? (
        <form onSubmit={submit} aria-busy={pending !== null}>
          <fieldset
            disabled={pending !== null}
            className="min-w-0 border-0 p-0"
          >
            <legend className="sr-only">
              {step.kind === "code"
                ? "Verification code"
                : step.kind === "password"
                  ? "New password"
                  : "Verify account email"}
            </legend>
            {step.kind === "code" && (
              <Field
                label="Verification code"
                id="password-code"
                hint="Enter the six-digit code from your account email."
              >
                <input
                  autoFocus
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </Field>
            )}
            {step.kind === "password" && (
              <div className="pf-grid">
                <Field
                  label="New password"
                  id="password-new"
                  className="pf-field-full"
                >
                  <input
                    autoFocus
                    required
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                <Field
                  label="Confirm new password"
                  id="password-confirm"
                  className="pf-field-full"
                >
                  <input
                    required
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                  />
                </Field>
              </div>
            )}
          </fieldset>
          {error && (
            <p className="pf-error" role="alert">
              {error}
            </p>
          )}
          <p className="pf-hint" role="status">
            {pending === "send"
              ? "Requesting verification code..."
              : pending === "verify"
                ? "Verifying code..."
                : pending === "update"
                  ? "Updating password..."
                  : notice}
          </p>
          <div className="pf-actions flex-wrap">
            <button
              type="button"
              className="pf-btn pf-btn-secondary"
              disabled={pending !== null}
              onClick={onClose}
            >
              Cancel
            </button>
            {step.kind === "code" && (
              <PendingButton
                type="button"
                className="pf-btn pf-btn-secondary"
                pending={pending === "send"}
                pendingLabel="Sending..."
                disabled={pending !== null || !available}
                onClick={() => void run("send")}
              >
                Resend code
              </PendingButton>
            )}
            <PendingButton
              type="submit"
              className="pf-btn pf-btn-primary"
              pending={
                pending ===
                (step.kind === "email"
                  ? "send"
                  : step.kind === "code"
                    ? "verify"
                    : "update")
              }
              pendingLabel={
                step.kind === "email"
                  ? "Sending..."
                  : step.kind === "code"
                    ? "Verifying..."
                    : "Updating..."
              }
              disabled={!available || pending !== null}
              aria-describedby={!available ? "password-integration" : undefined}
            >
              {step.kind === "email"
                ? "Send verification code"
                : step.kind === "code"
                  ? "Verify code"
                  : "Update password"}
            </PendingButton>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="pf-btn pf-btn-primary"
          onClick={onClose}
        >
          Done
        </button>
      )}
    </>
  );
}
