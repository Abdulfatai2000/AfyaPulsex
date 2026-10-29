import { requireCitizen } from "@/server/auth/rbac";
﻿import { CitizenDashboard } from "@/components/citizen/dashboard/CitizenDashboard";
import "./dashboard.css";
export default async function DashboardPage() {
  await requireCitizen();
  return <CitizenDashboard />;
}
