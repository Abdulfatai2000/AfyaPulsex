import { cache } from "react";
import type { Session } from "next-auth";
import type { CitizenContext, OfficerContext, AdminContext } from "@/types";
import { auth } from "./config";
import { redirect } from "next/navigation";
import { connectDB } from "@/server/db/connection";
import { User, OfficerProfile, Jurisdiction } from "@/server/models";

export const getCachedSession = cache(async (): Promise<Session | null> => {
  return auth();
});

export async function requireSession(): Promise<Session> {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth");
  return session;
}

/** Memoized user record lookup selecting all fields needed by RBAC in a single round-trip. */
export const getCachedUser = cache(async (userId: string) => {
  await connectDB();
  return User.findById(userId)
    .select("accountStatus suspendedUntil suspensionReason role emailVerified isDemo onboardingCompletedAt")
    .lean();
});

async function checkAccountStatus(userId: string): Promise<{ active: boolean; suspendedUntil?: Date | null; reason?: string | null }> {
  const user = await getCachedUser(userId);
  if (!user) return { active: false };
  if (user.accountStatus === "suspended") {
    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return { active: false, suspendedUntil: user.suspendedUntil, reason: user.suspensionReason };
    }
    // Suspension expired - auto-reactivate
    if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
      await connectDB();
      await User.findByIdAndUpdate(userId, { accountStatus: "active", suspendedUntil: null });
      return { active: true };
    }
    return { active: false, suspendedUntil: user.suspendedUntil, reason: user.suspensionReason };
  }
  if (user.accountStatus === "deactivated") {
    return { active: false, reason: "Account deactivated" };
  }
  return { active: true };
}

export async function requireVerifiedCitizen(): Promise<Session & CitizenContext> {
  const session = await requireSession();
  const accountCheck = await checkAccountStatus(session.user.id);
  if (!accountCheck.active) {
    redirect("/auth?suspended=1");
  }
  const user = await getCachedUser(session.user.id);
  if (!user || user.role !== "citizen") redirect("/auth");
  if (!user.emailVerified) {
    redirect(`/auth/verify-email?userId=${session.user.id}&email=${encodeURIComponent(session.user.email ?? "")}`);
  }
  return {
    ...session,
    user: { ...session.user, role: "citizen", isDemo: user.isDemo === true },
    userId: session.user.id,
    role: "citizen",
  };
}

/** Normal Citizen pages and actions require completed onboarding, using cached live DB state. */
export async function requireCitizen(): Promise<Session & CitizenContext> {
  const session = await requireVerifiedCitizen();
  const user = await getCachedUser(session.userId);
  if (!user?.onboardingCompletedAt) redirect("/onboarding");
  return session;
}

/** Memoized jurisdiction hierarchy traversal per server request. */
export const getCachedJurisdictionHierarchy = cache(async (rootJurisdictionId: string): Promise<string[]> => {
  await connectDB();
  const root = await Jurisdiction.findById(rootJurisdictionId).select("_id").lean();
  if (!root) return [];
  const ids = new Set<string>([root._id.toString()]);
  let frontier = [root._id];
  while (frontier.length) {
    const children = await Jurisdiction.find({ parent: { $in: frontier } })
      .select("_id")
      .lean();
    frontier = children
      .filter((child) => !ids.has(child._id.toString()))
      .map((child) => child._id);
    for (const id of frontier) ids.add(id.toString());
  }
  return [...ids];
});

export const getCachedOfficerProfile = cache(async (userId: string, isDemo?: boolean) => {
  await connectDB();
  return OfficerProfile.findOne({
    user: userId,
    simulation: isDemo ? true : { $ne: true },
  }).lean();
});

export async function requireApprovedOfficer(): Promise<
  Session & OfficerContext
> {
  const session = await requireSession();
  const accountCheck = await checkAccountStatus(session.user.id);
  if (!accountCheck.active) {
    redirect("/auth?suspended=1");
  }
  const user = await getCachedUser(session.user.id);
  const officer = await getCachedOfficerProfile(session.user.id, user?.isDemo);
  if (!officer) redirect("/officer/access-request");
  if (
    user?.role !== "officer" ||
    officer.status !== "approved" ||
    (officer.setupRequired && !officer.setupCompletedAt) ||
    !officer.jurisdiction
  )
    redirect("/officer/verification");

  const jurisdictionIds = await getCachedJurisdictionHierarchy(officer.jurisdiction.toString());
  if (!jurisdictionIds.length) redirect("/officer/verification");

  return {
    ...session,
    user: { ...session.user, role: "officer", isDemo: user?.isDemo === true },
    userId: session.user.id,
    role: "officer",
    officerProfileId: officer._id.toString(),
    capabilities: officer.capabilities,
    jurisdictionIds,
  };
}

export async function requireAdmin(): Promise<Session & AdminContext> {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/admin/login");
  const accountCheck = await checkAccountStatus(session.user.id);
  if (!accountCheck.active) {
    redirect("/admin/login?error=inactive");
  }
  const user = await getCachedUser(session.user.id);
  if (!user || user.role !== "admin" || user.isDemo) {
    redirect("/admin/login?error=forbidden");
  }
  return {
    ...session,
    user: { ...session.user, role: "admin" },
    userId: session.user.id,
    role: "admin",
  };
}

export async function requireCapability(
  capability: string,
  options: { allowDemo?: boolean } = {},
): Promise<Session & OfficerContext> {
  const session = await requireApprovedOfficer();
  if (session.user.isDemo && !options.allowDemo) throw new Error("Demo accounts cannot access live Officer operations.");
  if (!session.capabilities.includes(capability))
    throw new Error("Forbidden: required capability is missing.");
  return session;
}

export async function requireJurisdictionAccess(
  targetJurisdictionId: string,
): Promise<Session & OfficerContext> {
  const session = await requireLiveOfficer();
  if (!session.jurisdictionIds.includes(targetJurisdictionId))
    throw new Error("Forbidden: jurisdiction is outside your approved scope.");
  return session;
}

/** Live data/action boundary; demo accounts retain the normal approved Officer route guard. */
export async function requireLiveOfficer() {
  const session = await requireApprovedOfficer();
  if (session.user.isDemo) throw new Error("Demo accounts cannot access live Officer operations.");
  return session;
}

export async function requireWritableCitizen() {
 const session = await requireCitizen();
 if (session.user.isDemo) throw new Error("Demo accounts are read-only.");
 return session;
}
