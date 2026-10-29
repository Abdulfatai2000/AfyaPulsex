import { requireCitizen } from "@/server/auth/rbac";
import { VitalsPage } from "@/components/citizen/vitals/VitalsPage";
import { listVitalsAction } from "@/server/actions/citizen/vitals";
import "./vitals.css";

export default async function VitalsPageRoot() {
  await requireCitizen();
  let initialReadings = undefined;
  try {
    initialReadings = await listVitalsAction();
  } catch {
    // Falls back to client-side load if server fetch fails
  }
  return <VitalsPage initialReadings={initialReadings} />;
}
