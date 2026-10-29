import { requireCitizen } from "@/server/auth/rbac";
import { VitalsPage } from "@/components/citizen/vitals/VitalsPage";
import "./vitals.css";

export default async function VitalsPageRoot() {
  await requireCitizen();
  return <VitalsPage />;
}
