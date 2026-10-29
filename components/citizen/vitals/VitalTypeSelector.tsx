import { ChevronRight } from "lucide-react";
import type { VitalType } from "@/types/vitals";
import { vitalConfigs } from "./config";
export function VitalTypeSelector({
  onSelect,
}: {
  onSelect: (type: VitalType) => void;
}) {
  return (
    <div className="vt-options">
      {(Object.keys(vitalConfigs) as VitalType[]).map((type) => {
        const config = vitalConfigs[type];
        return (
          <button key={type} onClick={() => onSelect(type)}>
            <span className={"vt-icon vt-" + type}>
              <config.Icon aria-hidden="true" />
            </span>
            <span>
              <strong>{config.label}</strong>
              <small>{config.description}</small>
            </span>
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        );
      })}
    </div>
  );
}
