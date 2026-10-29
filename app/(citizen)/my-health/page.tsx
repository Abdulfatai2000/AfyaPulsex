import { requireCitizen } from "@/server/auth/rbac";
﻿import { MyHealthView } from "@/components/citizen/my-health/MyHealthView";
import "./my-health.css";
export default async function MyHealthPage() {
  await requireCitizen();
  return <MyHealthView />;
}
