import { CitizenShell } from "@/components/layout/citizen/CitizenShell";
import { requireVerifiedCitizen } from "@/server/auth/rbac";

export default async function CitizenLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Onboarding shares this shell; normal pages additionally requireCitizen().
  const session = await requireVerifiedCitizen();
  return <CitizenShell isDemo={session.user.isDemo === true}>{children}</CitizenShell>;
}
