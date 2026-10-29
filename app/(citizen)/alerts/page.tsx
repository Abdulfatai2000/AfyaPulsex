import { requireCitizen } from "@/server/auth/rbac";
import AlertsPage from "./AlertsPage";
import "./alerts.css";
import { Suspense } from "react";
import { PersonalHealthInsights } from "@/components/citizen/alerts/PersonalHealthInsights";
export default async function AlertsPageRoot() {
  await requireCitizen();
  return <AlertsPage personalInsights={<Suspense fallback={<p role="status">Loading your personal health insights…</p>}><PersonalHealthInsights /></Suspense>} />;
}
