"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, ShieldCheck, Search, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "./AccessRequest.module.css";

type Status = { status: string; identity?: { fullName: string; email: string; position: string; organization: string } };
export function OfficerAccountStatus({ setup = false }: { setup?: boolean }) {
  const [status, setStatus] = useState<Status>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [show, setShow] = useState(false);
  const started = useRef(false);

  async function post(body: unknown) {
    const response = await fetch("/api/officer/account-setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Please try again later.");
    return result;
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = window.location.hash.slice(1);
    if (token) window.history.replaceState(null, "", window.location.pathname);
    void (async () => {
      try {
        if (token) await post({ action: "exchange", token });
        const response = await fetch("/api/officer/account-setup", { cache: "no-store" });
        if (!response.ok) throw new Error("Status is temporarily unavailable.");
        setStatus(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Please try again.");
        setStatus({ status: "unverified" });
      }
    })();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      if (setup && status.status === "approved") {
        await post({ action: "activate", password: form.get("password"), confirmPassword: form.get("confirmPassword") });
        setStatus({ status: "created" });
        window.setTimeout(() => window.location.assign("/auth?entry=officer&setup=complete"), 2500);
      } else {
        const result = await post({ action: "check", fullName: form.get("fullName"), email: form.get("email") });
        setMessage(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const checking = status.status === "unverified";

  const statusConfig = {
    pending: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", title: "Request Under Review", description: "Your access request is still under review. We'll email you once a decision has been made. Please keep checking your email for updates." },
    rejected: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", title: "Request Not Approved", description: "Your request was not approved or is no longer active. Contact your reviewing authority for guidance." },
    unavailable: { icon: Lock, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", title: "Setup Unavailable", description: "Account setup is currently unavailable. Please contact your reviewing authority." },
    activated: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", title: "Account Already Active", description: "Your Officer account has already been activated. Sign in to continue." },
    created: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", title: "Account Ready", description: "Your Officer account is ready. Sign in to continue." },
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>AFYAPULSE / OFFICER ACCESS</p>
        <h1>{setup ? "Set Up Your Officer Account" : "Check Approval Status"}</h1>
        <p>For Disease Surveillance and Notification Officers (DSNOs) and other authorised public-health professionals.</p>
      </header>
      <div className={styles.composition}>
        <div className={`${styles.form} ${styles["form--status"]}`}>
          <section className={styles.card}>
            <header className={styles.formHeader}>
              <ShieldCheck aria-hidden="true" />
              <h2>{setup ? "Complete your approved account" : "Your application status"}</h2>
              <p>Only your original official email can unlock your request status and account setup.</p>
            </header>

            {error && (
              <div className={styles.alert} role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className={styles.success} role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>{message}</span>
              </div>
            )}

            {status.status === "loading" && (
              <div className={styles.loadingState} role="status">
                <LoaderCircle className={styles.spinner} size={24} aria-hidden="true" />
                <p>Checking your secure session&hellip;</p>
              </div>
            )}

            {checking && (
              <form onSubmit={submit} className={styles.statusForm}>
                <div className={styles.fields}>
                  <div className={styles.fieldGroup}>
                    <Label htmlFor="status-name">Original Full Name</Label>
                    <div className={styles.inputWrapper}>
                      <Search className={styles.inputIcon} aria-hidden="true" />
                      <Input
                        id="status-name"
                        name="fullName"
                        autoComplete="name"
                        required
                        maxLength={120}
                        placeholder="Enter your full name as on official ID"
                        disabled={busy}
                      />
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <Label htmlFor="status-email">Original Official Email</Label>
                    <div className={styles.inputWrapper}>
                      <Search className={styles.inputIcon} aria-hidden="true" />
                      <Input
                        id="status-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        placeholder="name@health.gov.ng"
                        disabled={busy}
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.actions}>
                  <Link href="/officer/access-request" className={styles.secondaryAction}>
                    Back to request
                  </Link>
                  <Button type="submit" disabled={busy} className={styles.primaryAction} aria-busy={busy}>
                    {busy && <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" />}
                    <Search size={18} aria-hidden="true" />
                    Check Approval Status
                  </Button>
                </div>
              </form>
            )}

            {statusConfig[status.status as keyof typeof statusConfig] && (() => {
                const cfg = statusConfig[status.status as keyof typeof statusConfig];
                const Icon = cfg.icon;
                return (
                  <div className={`${styles.statusCard} ${cfg.bg}`} role="status">
                    <div className={styles.statusIconWrapper}>
                      <Icon size={28} aria-hidden="true" className={cfg.color} />
                    </div>
                    <div className={styles.statusContent}>
                      <h3 className={styles.statusTitle}>{cfg.title}</h3>
                      <p className={styles.statusDescription}>{cfg.description}</p>
                    </div>
                    {["activated", "created"].includes(status.status) && (
                      <Link href="/auth?entry=officer" className={styles.ctaButton}>
                        <Button className="w-full">Sign in as Officer</Button>
                      </Link>
                    )}
                  </div>
                );
              })()}

            {status.status === "approved" && !setup && (
              <div className={styles.statusCard} style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }} role="status">
                <div className={styles.statusIconWrapper}>
                  <CheckCircle2 size={28} aria-hidden="true" className="text-emerald-600" />
                </div>
                <div className={styles.statusContent}>
                  <h3 className={styles.statusTitle}>Your Officer access has been approved.</h3>
                  <p className={styles.statusDescription}>Your request has been reviewed and approved by the appropriate authority.</p>
                  {status.identity && (
                    <dl className={styles.approvedSummary}>
                      <div className={styles.summaryRow}><dt>Full Name</dt><dd>{status.identity.fullName}</dd></div>
                      <div className={styles.summaryRow}><dt>Official Email</dt><dd>{status.identity.email}</dd></div>
                      <div className={styles.summaryRow}><dt>Official Designation</dt><dd>{status.identity.position}</dd></div>
                      <div className={styles.summaryRow}><dt>Surveillance Authority</dt><dd>{status.identity.organization}</dd></div>
                    </dl>
                  )}
                </div>
                <Link href="/officer/access-request/setup" className={styles.ctaButton}>
                  <Button className="w-full">Set Up Officer Account</Button>
                </Link>
              </div>
            )}

            {status.status === "approved" && setup && (
              <form onSubmit={submit} className={styles.setupForm}>
                <div className={styles.fields} data-step="3">
                  <dl className={styles.review}>
                    {Object.entries(status.identity ?? {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-4 border-b py-3">
                        <dt>{({ fullName: "Full Name", email: "Official Email", position: "Official Designation", organization: "Surveillance Authority" } as Record<string, string>)[key]}</dt>
                        <dd className="break-words text-right">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className={styles.setupNote}>Use at least 8 characters and at most 72 UTF-8 bytes. Your approved identity and access scope cannot be changed here.</p>
                  <div className={styles.fieldGroup}>
                    <Label htmlFor="setup-password">Password</Label>
                    <div className={styles.inputWrapper}>
                      <Lock className={styles.inputIcon} aria-hidden="true" />
                      <Input
                        id="setup-password"
                        data-field="password"
                        name="password"
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={128}
                        required
                        disabled={busy}
                      />
                      <button
                        type="button"
                        className={styles.toggleButton}
                        aria-label={show ? "Hide passwords" : "Show passwords"}
                        aria-pressed={show}
                        onClick={() => setShow(!show)}
                      >
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <Label htmlFor="setup-confirm">Confirm Password</Label>
                    <div className={styles.inputWrapper}>
                      <Lock className={styles.inputIcon} aria-hidden="true" />
                      <Input
                        id="setup-confirm"
                        name="confirmPassword"
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={128}
                        required
                        disabled={busy}
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.actions}>
                  <Link href="/officer/access-request/status" className={styles.secondaryAction}>
                    Back to status
                  </Link>
                  <Button type="submit" disabled={busy} className={styles.primaryAction} aria-busy={busy}>
                    {busy && <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" />}
                    Create Officer Account
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}