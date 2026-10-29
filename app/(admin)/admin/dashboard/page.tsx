import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export default function AdminDashboardPage() {
  // The existing Admin layout enforces the database-backed role/status guard.
  return <AdminDashboardClient />;
}
