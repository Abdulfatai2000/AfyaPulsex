"use client";
import { Badge } from "@/components/ui/badge";
export function StatusBadge({ label }: { label: string }) {
  return <Badge variant="outline">{label}</Badge>;
}
