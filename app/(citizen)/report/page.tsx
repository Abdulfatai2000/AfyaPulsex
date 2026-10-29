import { requireCitizen } from "@/server/auth/rbac";
import { ReportFlow } from "@/components/citizen/report/ReportFlow";
import "./report.css";
export default async function ReportPage() {
  await requireCitizen();
  return <ReportFlow />;
}