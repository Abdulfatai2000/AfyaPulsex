import "server-only";
import { redirect } from "next/navigation";
import { requireVerifiedCitizen } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { User } from "@/server/models/User";
import { onboardingDraftSchema } from "@/server/validation/onboarding";

export async function getCitizenOnboarding() {
  const session = await requireVerifiedCitizen();
  await connectDB();
  const user = await User.findOne({ _id: session.user.id, role: "citizen" })
    .select("name onboardingStep onboardingCompletedAt +onboardingDraft")
    .lean();
  if (!user) redirect("/auth");
  const saved = onboardingDraftSchema.safeParse(user.onboardingDraft);
  return {
    userId: session.user.id,
    name: user.name,
    complete: !!user.onboardingCompletedAt,
    step: saved.success
      ? Math.min(3, Math.max(0, user.onboardingStep ?? 0))
      : 0,
    draft: saved.success ? saved.data : undefined,
  };
}
