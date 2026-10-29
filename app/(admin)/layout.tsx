import { AdminShell } from "@/components/layout/admin/AdminShell";
import { requireAdmin } from "@/server/auth/rbac";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}