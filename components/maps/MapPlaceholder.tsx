import { FeaturePlaceholder } from "@/components/shared/FeaturePlaceholder";
// Shared presentation slot. No chart/map library or fake data initialized.
export function MapPlaceholder({ title = "Map" }: { title?: string }) {
  return <FeaturePlaceholder title={title} />;
}
