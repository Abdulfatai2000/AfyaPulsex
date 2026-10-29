import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { getAdminDashboardDataAction } from "@/server/actions/admin/dashboard";

export default async function AdminDashboardPage() {
  let initialStats = undefined;
  let initialActivity = undefined;

  try {
    const data = await getAdminDashboardDataAction();
    initialStats = data.stats;
    initialActivity = data.recentActivity;
  } catch {
    // Falls back to client-side loading if server fetch fails
  }

  return (
    <AdminDashboardClient
      initialStats={initialStats}
      initialActivity={initialActivity}
    />
  );
}
