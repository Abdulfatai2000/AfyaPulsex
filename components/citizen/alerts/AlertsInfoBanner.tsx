import { Info } from "lucide-react";
export function AlertsInfoBanner() {
  return (
    <div className="al-banner" role="note">
      <Info aria-hidden="true" size={20} />
      <div>
        <strong>These are public health alerts reviewed and published by authorized health authorities.</strong>
        <p>
          Alerts provide general information and guidance for your safety. They do not contain your personal health
          information.
        </p>
      </div>
    </div>
  );
}
