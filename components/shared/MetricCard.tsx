import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>{value}</CardContent>
    </Card>
  );
}
