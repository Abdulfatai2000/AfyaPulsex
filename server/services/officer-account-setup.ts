import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { AccessRequest, OfficerProfile, User, ApprovalDecision } from "@/server/models";
import { connectDB } from "@/server/db/connection";
import { sendEmail } from "@/server/services/email";
import { emailSchema, fullNameSchema, passwordSchema } from "@/lib/validation/validators";
import hashPassword from "@/server/lib/hashpassword";
import { officerRateLimit } from "./officer-rate-limit";

export const STATUS_COOKIE = "afya-officer-status";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const normalizedName = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
const validToken = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export const STATUS_MESSAGE = "If those details match a request, a secure status link will be sent to the original official email. Check your inbox and spam folder. You can request another link later.";

export async function requestOfficerStatus(fullName: unknown, email: unknown) {
  const identity = { name: fullNameSchema.safeParse(fullName), email: emailSchema.safeParse(email) };
  if (!identity.name.success || !identity.email.success) return;
  await connectDB();
  if (!await officerRateLimit(`status:${identity.email.data}`, 3) || !await officerRateLimit("status:global", 100)) return;
  const user = await User.findOne({ email: identity.email.data, role: "officer" }).lean();
  if (!user) return;
  const profile = await OfficerProfile.findOne({ user: user._id }).lean();
  if (!profile) return;
  const request = await AccessRequest.findOne({ officer: profile._id }).sort({ requestedAt: -1 }).lean();
  if (!request || (request.applicant?.email && request.applicant.email !== user.email) || normalizedName(request.applicant?.fullName ?? user.name) !== normalizedName(identity.name.data)) return;
  const token = randomBytes(32).toString("hex");
  await AccessRequest.updateOne({ _id: request._id }, { $set: { statusTokenHash: digest(token), statusTokenExpiresAt: new Date(Date.now() + 15 * 60_000) } });
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
  // Fragment is not included in HTTP requests, referrers, or server access logs.
  const url = new URL("/officer/access-request/status", base); url.hash = token;
  const result = await sendEmail({ to: user.email, subject: "Your AfyaPulse Officer request status link", eventType: "verification",
    text: `Open this secure link to check your Officer request and, if approved, set up your account: ${url.toString()}\nThis link expires in 15 minutes and can be opened once. Ignore this email if you did not request it.`,
    html: `<p>Open the secure link below to check your Officer request and, if approved, set up your account.</p><p><a href="${url.toString()}">Check Approval Status</a></p><p>Expires in 15 minutes. Single use. Ignore this message if you did not request it.</p>`,
  });
  if (!result.success) await AccessRequest.updateOne({ _id: request._id, statusTokenHash: digest(token) }, { $unset: { statusTokenHash: "", statusTokenExpiresAt: "" } });
}

export async function exchangeOfficerStatusToken(token: unknown) {
  if (!validToken(token)) return null;
  await connectDB();
  const sessionToken = randomBytes(32).toString("hex");
  const request = await AccessRequest.findOneAndUpdate({ statusTokenHash: digest(token), statusTokenExpiresAt: { $gt: new Date() } }, {
    $unset: { statusTokenHash: "", statusTokenExpiresAt: "" },
    $set: { statusSessionHash: digest(sessionToken), statusSessionExpiresAt: new Date(Date.now() + 15 * 60_000) },
  }).lean();
  return request ? sessionToken : null;
}

async function authorizedRequest(token: unknown) {
  if (!validToken(token)) return null;
  await connectDB();
  return AccessRequest.findOne({ statusSessionHash: digest(token), statusSessionExpiresAt: { $gt: new Date() } }).lean();
}

export async function getOfficerSetupStatus(token: unknown) {
  const request = await authorizedRequest(token);
  if (!request) return null;
  const profile = await OfficerProfile.findById(request.officer).lean();
  const user = profile ? await User.findById(profile.user).select("+passwordHash").lean() : null;
  if (!profile || !user || user.role !== "officer" || user.accountStatus !== "active" || (request.applicant?.email && request.applicant.email !== user.email)) return { status: "unavailable" as const };
  if (request.status === "pending") return { status: "pending" as const };
  if (request.status !== "approved" || (request.expiresAt && request.expiresAt <= new Date())) return { status: "rejected" as const };
  if (profile.status !== "approved" || !await ApprovalDecision.exists({ accessRequest: request._id, decision: "approved" })) return { status: "unavailable" as const };
  if (request.setupCompletedAt || profile.setupCompletedAt || user.passwordHash) return { status: "activated" as const };
  if (!profile.setupRequired) return { status: "unavailable" as const };
  return { status: "approved" as const, identity: {
    fullName: request.applicant?.fullName ?? user.name, email: user.email,
    position: request.applicant?.position ?? profile.title ?? "",
    organization: request.applicant?.organization ?? profile.organizationName ?? "",
  } };
}

export async function activateOfficerAccount(token: unknown, password: unknown, confirmation: unknown) {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success || parsed.data !== confirmation || Buffer.byteLength(parsed.data, "utf8") > 72) throw new Error("Use matching passwords of at least 8 characters and at most 72 UTF-8 bytes.");
  const request = await authorizedRequest(token);
  if (!request || !validToken(token)) throw new Error("Request a new status link.");
  const passwordHash = await hashPassword(parsed.data);
  await AccessRequest.db.transaction(async session => {
    const claimed = await AccessRequest.findOneAndUpdate({ _id: request._id, status: "approved", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }], statusSessionHash: digest(token), statusSessionExpiresAt: { $gt: new Date() }, setupCompletedAt: { $exists: false } }, {
      $set: { setupCompletedAt: new Date() }, $unset: { statusSessionHash: "", statusSessionExpiresAt: "", statusTokenHash: "", statusTokenExpiresAt: "" },
    }, { session }).lean();
    if (!claimed || !await ApprovalDecision.exists({ accessRequest: request._id, decision: "approved" }).session(session)) throw new Error("Account setup is unavailable or already completed.");
    const profile = await OfficerProfile.findOneAndUpdate({ _id: request.officer, jurisdiction: request.jurisdiction, status: "approved", setupRequired: true, setupCompletedAt: { $exists: false } }, { $set: { setupCompletedAt: new Date() } }, { session }).lean();
    if (!profile || !profile.jurisdiction) throw new Error("Approved profile unavailable.");
    if (!request.applicant?.email) throw new Error("Approved identity unavailable.");
    const changed = await User.updateOne({ _id: profile.user, email: request.applicant.email, role: "officer", accountStatus: "active", passwordHash: { $exists: false } }, { $set: { passwordHash, emailVerified: new Date() } }, { session });
    if (changed.modifiedCount !== 1) throw new Error("Account setup is unavailable or already completed.");
  });
}
