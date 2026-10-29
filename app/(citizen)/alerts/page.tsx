import { requireCitizen } from "@/server/auth/rbac";
import AlertsPage from "./AlertsPage";
import { getAlertsAction } from "@/server/actions/citizen/alerts";
import "./alerts.css";
import { Suspense } from "react";
import { PersonalHealthInsights } from "@/components/citizen/alerts/PersonalHealthInsights";

export default async function AlertsPageRoot() {
  await requireCitizen();
  let initialFeed = undefined;
  try {
    initialFeed = await getAlertsAction();
  } catch {
    // Falls back to client-side load if server action fails
  }
  return (
    <AlertsPage
      initialFeed={initialFeed}
      personalInsights={
        <Suspense fallback={<p role="status">Loading your personal health insights…</p>}>
          <PersonalHealthInsights />
        </Suspense>
      }
    />
  );
}
