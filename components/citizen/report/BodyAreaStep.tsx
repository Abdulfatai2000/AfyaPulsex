"use client";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportDraft } from "@/types/report";
import { BODY_REGIONS } from "./body-regions";
import { BodyMap } from "./BodyMap";

interface BodyAreaStepProps {
  value: Pick<ReportDraft, "bodyArea" | "symptoms">;
  onChange: (value: Pick<ReportDraft, "bodyArea">) => void;
  onBack: () => void;
  onNext: () => void;
}

export function BodyAreaStep({
  value,
  onChange,
  onBack,
  onNext,
}: BodyAreaStepProps) {
  const selectedRegions = value.bodyArea.split(", ").filter(Boolean);

  const handleRegionSelect = (regionId: string) => {
    if (
      selectedRegions.length >= 3 ||
      selectedRegions.includes(regionId) ||
      !BODY_REGIONS.some((region) => region.id === regionId)
    )
      return;
    const newRegions = [...selectedRegions, regionId];
    onChange({ bodyArea: newRegions.join(", ") });
  };

  const handleRegionRemove = (regionId: string) => {
    const newRegions = selectedRegions.filter((r) => r !== regionId);
    onChange({ bodyArea: newRegions.join(", ") });
  };

  const canContinue = selectedRegions.length > 0;

  return (
    <div className="ba-body-area-step">
      <BodyMap
        selectedRegions={selectedRegions}
        onRegionSelect={handleRegionSelect}
        onRegionRemove={handleRegionRemove}
        maxSelections={3}
        navigation={
          <div className="ba-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="ba-back"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </Button>
            <Button
              type="button"
              onClick={onNext}
              disabled={!canContinue}
              className="ba-next"
            >
              Continue <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        }
      />
    </div>
  );
}
