"use client";
import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Info, X } from "lucide-react";
import { cn } from "cn";
import styles from "./BodyMap.module.css";
import { BodyMapView } from "./BodyMapView";
import { BODY_REGIONS } from "./body-regions";

const mobileQuery = "(max-width: 899px)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const uniqueRegions = BODY_REGIONS.filter(
  (region, index, all) =>
    all.findIndex((item) => item.id === region.id) === index,
);

interface BodyMapProps {
  selectedRegions: string[];
  onRegionSelect: (regionId: string) => void;
  onRegionRemove: (regionId: string) => void;
  maxSelections?: number;
  disabled?: boolean;
  className?: string;
  navigation?: ReactNode;
}

export function BodyMap({
  selectedRegions,
  onRegionSelect,
  onRegionRemove,
  maxSelections = 3,
  disabled = false,
  className,
  navigation,
}: BodyMapProps) {
  const mobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  );
  const [currentView, setCurrentView] = useState<"front" | "back">("front");
  const [focusedRegion, setFocusedRegion] = useState<string | null>(null);
  const id = useId();
  const alternatives = useRef<HTMLDivElement>(null);
  const isAtMax = selectedRegions.length >= maxSelections;
  const activeId =
    focusedRegion && selectedRegions.includes(focusedRegion)
      ? focusedRegion
      : selectedRegions.at(-1);
  const active = BODY_REGIONS.find((region) => region.id === activeId);

  function select(regionId: string) {
    if (disabled || isAtMax || selectedRegions.includes(regionId)) return;
    onRegionSelect(regionId);
    setFocusedRegion(regionId);
    if (
      !BODY_REGIONS.some(
        (region) => region.id === regionId && region.view === currentView,
      )
    ) {
      const orientation = BODY_REGIONS.find(
        (region) => region.id === regionId,
      )?.view;
      if (orientation) setCurrentView(orientation);
    }
  }
  function toggle(regionId: string) {
    if (disabled) return;
    if (selectedRegions.includes(regionId)) onRegionRemove(regionId);
    else select(regionId);
  }
  function focusQuickList() {
    alternatives.current?.scrollIntoView({ block: "nearest" });
    alternatives.current
      ?.querySelector<HTMLButtonElement>(
        'button[aria-pressed="true"], button:not(:disabled)',
      )
      ?.focus();
  }

  return (
    <div className={cn("bm-container", styles.root, className)}>
      <div className="bm-layout">
        <div className="bm-diagrams">
          {mobile && (
            <div
              className="bm-view-toggle"
              role="tablist"
              aria-label="Body orientation"
            >
              {(["front", "back"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  id={`${id}-${view}-tab`}
                  aria-controls={`${id}-${view}-panel`}
                  aria-selected={currentView === view}
                  tabIndex={currentView === view ? 0 : -1}
                  disabled={disabled}
                  className={cn(
                    "bm-view-btn",
                    currentView === view && "bm-view-btn--active",
                  )}
                  onClick={() => setCurrentView(view)}
                  onKeyDown={(event) => {
                    if (
                      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    ) {
                      event.preventDefault();
                      const next =
                        event.key === "Home"
                          ? "front"
                          : event.key === "End"
                            ? "back"
                            : view === "front"
                              ? "back"
                              : "front";
                      setCurrentView(next);
                      document.getElementById(`${id}-${next}-tab`)?.focus();
                    }
                  }}
                >
                  {view === "front" ? "Front" : "Back"}
                </button>
              ))}
            </div>
          )}
          <div className="bm-views">
            {(["front", "back"] as const).map((view) => (
              <section
                key={view}
                id={`${id}-${view}-panel`}
                role={mobile ? "tabpanel" : undefined}
                aria-labelledby={
                  mobile ? `${id}-${view}-tab` : `${id}-${view}-title`
                }
                hidden={mobile && currentView !== view}
                className="bm-view-panel"
              >
                {!mobile && (
                  <h2
                    id={`${id}-${view}-title`}
                    className={cn(
                      "bm-orientation",
                      view === "front" && "bm-orientation--front",
                    )}
                  >
                    {view === "front" ? "Front View" : "Back View"}
                  </h2>
                )}
                <BodyMapView
                  view={view}
                  selectedRegions={selectedRegions}
                  onRegionSelect={select}
                  onRegionRemove={onRegionRemove}
                  maxSelections={maxSelections}
                  disabled={disabled}
                  showCallouts={!mobile}
                />
              </section>
            ))}
          </div>
          <div className="bm-legend" aria-hidden="true">
            <span>
              <i className="bm-key-available" />
              Available
            </span>
            <span>
              <i className="bm-key-selected" />
              Selected
            </span>
          </div>
        </div>
        <aside className="bm-selection-panel" aria-label="Selected body areas">
          <div className="bm-preview">
            <h2>Selected Area</h2>
            <div className="bm-preview-card">
              {active ? (
                <>
                  <BodyMapView
                    view={active.view}
                    selectedRegions={[active.id]}
                    onRegionSelect={() => {}}
                    onRegionRemove={() => {}}
                    disabled
                    preview
                  />
                  <strong>{active.label}</strong>
                  <button
                    type="button"
                    className="bm-change"
                    onClick={focusQuickList}
                    disabled={disabled}
                  >
                    Change selection
                  </button>
                </>
              ) : (
                <p className="bm-empty">
                  Select an area on either body map to preview it here.
                </p>
              )}
            </div>
          </div>
          <h3>
            Selected Areas <span>(up to {maxSelections})</span>
          </h3>
          <div
            className="bm-selected-chips"
            role="list"
            aria-label="Selected body regions"
          >
            {selectedRegions.length ? (
              selectedRegions.map((regionId) => {
                const label =
                  BODY_REGIONS.find((region) => region.id === regionId)
                    ?.label ?? regionId;
                return (
                  <div
                    key={regionId}
                    className={cn(
                      "bm-chip",
                      regionId === activeId && "bm-chip--active",
                    )}
                    role="listitem"
                  >
                    <span>{label}</span>
                    <button
                      type="button"
                      onClick={() => onRegionRemove(regionId)}
                      aria-label={`Remove ${label}`}
                      disabled={disabled}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="bm-empty">No areas selected yet.</p>
            )}
          </div>
          <p className="bm-selection-status" role="status">
            {selectedRegions.length} of {maxSelections} selected.
            {isAtMax
              ? " Remove an area to choose another."
              : " Select one or more areas to continue."}
          </p>
          <button
            type="button"
            className="bm-quick-link"
            onClick={focusQuickList}
          >
            <Info size={18} aria-hidden="true" />
            <span>
              <strong>Can&apos;t select the exact area?</strong>
              <small>Use the quick list below.</small>
            </span>
          </button>
          {navigation}
        </aside>
      </div>
      <section
        className="bm-alternative"
        aria-labelledby={`${id}-alternatives`}
      >
        <h2 id={`${id}-alternatives`}>
          Body Region Chips <span>(Alternative Selection)</span>
        </h2>
        <p>
          Choose the exact side or area below. Left and right refer to your own
          body.
        </p>
        <div
          ref={alternatives}
          className="bm-alt-grid"
          role="group"
          aria-label="Body regions"
        >
          {uniqueRegions.map((region) => (
            <button
              key={region.id}
              type="button"
              className={cn(
                "bm-alt-btn",
                selectedRegions.includes(region.id) && "bm-alt-btn--selected",
              )}
              aria-pressed={selectedRegions.includes(region.id)}
              disabled={
                disabled || (isAtMax && !selectedRegions.includes(region.id))
              }
              onClick={() => toggle(region.id)}
            >
              {region.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
