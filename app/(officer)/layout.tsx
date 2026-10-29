import { OfficerShell } from "@/components/layout/officer/OfficerShell";
import { requireApprovedOfficer } from "@/server/auth/rbac";
export default async function OfficerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireApprovedOfficer();
  return <OfficerShell>{children}</OfficerShell>;
}
