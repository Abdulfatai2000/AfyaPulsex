import { requireCitizen } from "@/server/auth/rbac";
import { CitizenDashboard } from "@/components/citizen/dashboard/CitizenDashboard";
import { getDashboardAction } from "@/server/actions/citizen/dashboard";
import "./dashboard.css";

export default async function DashboardPage() {
  await requireCitizen();
  let initialData = undefined;
  try {
    initialData = await getDashboardAction("1w");
  } catch {
    // Falls back to client-side loading if initial fetch fails
  }
  return <CitizenDashboard initialData={initialData} />;
}
