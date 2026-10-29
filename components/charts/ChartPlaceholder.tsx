import { FeaturePlaceholder } from "@/components/shared/FeaturePlaceholder";
// Shared presentation slot. No chart/map library or fake data initialized.
export function ChartPlaceholder({ title = "Chart" }: { title?: string }) {
  return <FeaturePlaceholder title={title} />;
}
