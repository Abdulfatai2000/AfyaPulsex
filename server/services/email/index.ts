// Email service — Server-only transactional email via Gmail SMTP (nodemailer).
// This module runs on the server only ("use server") so SMTP credentials
// are never exposed to client-side code.
"use server";

import { createTransport, Transporter, SentMessageInfo } from "nodemailer";
import { randomUUID } from "node:crypto";

export type EmailEventType = "submitted" | "approved" | "rejected" | "verification";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  eventType?: EmailEventType;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/** Escape user-supplied text interpolated into HTML email bodies. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "\"")
    .replace(/'/g, "'");
}

function isValidRecipient(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getEmailFrom(): string {
  const fromName = "AfyaPulse";
  const fromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "").trim();
  // Existing configurations may already contain "AfyaPulse <address>".
  // Wrapping that again produces an invalid nested From header.
  if (fromEmail.includes("<")) return fromEmail;
  return `${fromName} <${fromEmail}>`;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Send an email via Gmail SMTP (server only).
 *
 * Honest delivery reporting: success is true only when the SMTP server
 * accepts the message. Missing configuration, validation failures, provider
 * errors, and exceptions all return success: false so callers never
 * falsely report that an email was sent. Server logs carry diagnostic info
 * — event type, masked recipient, message ID, and error codes — never
 * API keys, passwords, tokens, or applicant PII.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const recipient = options.to?.trim() ?? "";
  const eventType = options.eventType ?? "unknown";
  const maskedRecipient = maskEmail(recipient);

  if (!isValidRecipient(recipient)) {
    console.error(
      JSON.stringify({
        event: "email_send",
        eventType,
        recipient: maskedRecipient,
        success: false,
        error: "Invalid recipient email address",
      }),
    );
    return { success: false, error: "Invalid recipient email address" };
  }

  // Test hook for honest failure handling
  if (process.env.EMAIL_SIMULATE_FAILURE === "true") {
    console.error(
      JSON.stringify({
        event: "email_send",
        eventType,
        recipient: maskedRecipient,
        success: false,
        error: "Simulated email failure",
      }),
    );
    return { success: false, error: "Simulated email failure" };
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.error(
      JSON.stringify({
        event: "email_send",
        eventType,
        recipient: maskedRecipient,
        success: false,
        error: "Email service not configured (missing SMTP credentials)",
      }),
    );
    return { success: false, error: "Email service not configured" };
  }

  const attemptId = randomUUID();
  const startedAt = Date.now();
  console.info(JSON.stringify({
    event: "smtp_attempt", attemptId, at: new Date().toISOString(),
    recipient: maskedRecipient,
    recipientMatchesInput: recipient === options.to,
    from: redactSmtpText(getEmailFrom()),
    fromContainsNestedBrackets: (getEmailFrom().match(/</g) ?? []).length > 1,
  }));
  try {
    const t = getTransporter();
    const info: SentMessageInfo = await t.sendMail({
      from: getEmailFrom(),
      to: recipient,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.info(
      JSON.stringify({
        event: "email_send",
        eventType,
        recipient: maskedRecipient,
        success: true,
        messageId: info.messageId,
        attemptId,
        at: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt,
        accepted: smtpRecipients(info.accepted),
        rejected: smtpRecipients(info.rejected),
        intendedRecipientAccepted: recipientIncluded(info.accepted, recipient),
        intendedRecipientRejected: recipientIncluded(info.rejected, recipient),
        smtpResponse: redactSmtpText(info.response),
      }),
    );
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    const smtpError = err && typeof err === "object" ? err as {
      code?: unknown; command?: unknown; responseCode?: unknown; response?: unknown;
      rejected?: unknown;
    } : {};
    console.error(
      JSON.stringify({
        event: "email_send",
        eventType,
        recipient: maskedRecipient,
        success: false,
        attemptId,
        at: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt,
        errorCode: redactSmtpText(smtpError.code),
        command: redactSmtpText(smtpError.command),
        responseCode: typeof smtpError.responseCode === "number" ? smtpError.responseCode : null,
        rejected: smtpRecipients(smtpError.rejected),
        smtpResponse: redactSmtpText(smtpError.response),
      }),
    );
    return {
      success: false,
      error: errMsg,
    };
  }
}

// Temporary SMTP diagnostics. Never log message bodies, OTPs, auth objects or raw errors.
function redactSmtpText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let text = value;
  for (const secret of [process.env.SMTP_PASS, process.env.AUTH_SECRET, process.env.MONGODB_URI]) {
    if (secret) text = text.split(secret).join("[redacted]");
  }
  return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, maskEmail)
    .replace(/[\r\n\x00-\x1f]/g, " ").slice(0, 500);
}
function recipientAddress(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "address" in value && typeof value.address === "string") return value.address;
  return null;
}
function smtpRecipients(value: unknown): string[] {
  return Array.isArray(value) ? value.map(recipientAddress).filter((address): address is string => address !== null).map(maskEmail) : [];
}
function recipientIncluded(value: unknown, expected: string): boolean {
  return Array.isArray(value) && value.some(item => recipientAddress(item)?.trim().toLowerCase() === expected.toLowerCase());
}

/** Mask email for logging: keep domain, hide local part except first/last char. */
function maskEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return "invalid-email";
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  if (local.length <= 2) return `**${domain}`;
  return `${local[0]}***${local[local.length - 1]}${domain}`;
}

/**
 * Officer access request decision notification.
 */
export async function sendApprovalEmail(email: string, name: string, approved: boolean, _reason?: string): Promise<EmailResult> {
  const url = `${getAppUrl()}/officer/access-request/status`;
  const message = approved
    ? "Your Public Health Officer / DSNO access has been approved. Return to AfyaPulse and use Check Approval Status with your original Full Name and Official Email. Open the secure email link, select Set Up Officer Account, create your password, then return to Officer Login. If already activated, sign in normally."
    : "Your Officer access request was not approved. Contact your reviewing authority for guidance. Internal review details are not included in this email.";
  return sendEmail({ to: email, subject: approved ? "Your AfyaPulse Officer Access Has Been Approved" : "Your AfyaPulse Officer Access Request Update",
    html: `<p>Dear ${escapeHtml(name)},</p><p>${message}</p><p><a href="${url}">Check Approval Status</a></p>`,
    text: `Dear ${name},\n\n${message}\n\n${url}`, eventType: approved ? "approved" : "rejected" });
}

export async function sendSubmissionConfirmationEmail(email: string, name: string, _requestId?: string): Promise<EmailResult> {
  const url = `${getAppUrl()}/officer/access-request/status`;
  const message = "Your Officer access request was received and is awaiting review by the appropriate authority. Submitting a request does not automatically grant Officer access. Please keep checking your email for updates. You can also return to AfyaPulse and use Check Approval Status.";
  return sendEmail({ to: email, subject: "AfyaPulse Officer Access Request Received",
    html: `<p>Dear ${escapeHtml(name)},</p><p>${message}</p><p><a href="${url}">Check Approval Status</a></p>`,
    text: `Dear ${name},\n\n${message}\n\n${url}`, eventType: "submitted" });
}
