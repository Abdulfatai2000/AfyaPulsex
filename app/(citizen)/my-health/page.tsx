import { requireCitizen } from "@/server/auth/rbac";
import { MyHealthView } from "@/components/citizen/my-health/MyHealthView";
import { getMyHealthDataAction } from "@/server/actions/citizen/my-health";
import "./my-health.css";

export default async function MyHealthPage() {
  await requireCitizen();
  let initialData = undefined;
  try {
    initialData = await getMyHealthDataAction();
  } catch {
    // Falls back to client-side load if server fetch fails
  }
  return <MyHealthView initialData={initialData} />;
}
