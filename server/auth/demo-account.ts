import "server-only";
import { User, OfficerProfile, Jurisdiction } from "@/server/models";
import { connectDB } from "@/server/db/connection";
import { officerRateLimit } from "@/server/services/officer-rate-limit";

/** Public entry is intentionally passwordless, but only for provisioned demo slots. */
export async function authorizeDemoAccount(role: unknown, request: Request) {
  if (role !== "citizen" && role !== "officer") return null;
  await connectDB();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!await officerRateLimit(`demo-login:${role}:${ip}`, 30, 60)) return null;
  const user = await User.findOne({
    demoSlot: role, role, isDemo: true, simulation: true,
    accountStatus: "active", emailVerified: { $ne: null },
  }).lean();
  if (!user) return null;
  if (role === "citizen" && !user.onboardingCompletedAt) return null;
  if (role === "officer") {
    const profile = await OfficerProfile.findOne({ user: user._id, status: "approved", simulation: true }).lean();
    if (!profile?.setupCompletedAt || !profile.jurisdiction) return null;
    const jurisdiction = await Jurisdiction.findById(profile.jurisdiction).select("level code").lean();
    if (!jurisdiction || jurisdiction.level !== "country" || jurisdiction.code !== "NG") return null;
  }
  return {
    id: String(user._id), name: user.name, email: user.email, role: user.role,
    image: user.image, isDemo: true, simulation: true, emailVerified: user.emailVerified,
  };
}
