"use client";

import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { latLngBounds } from "leaflet";
import {
  validMapPoint,
  type MapViewport,
} from "@/lib/services/officer/map-scope";
import type { OfficerDataMode } from "@/lib/services/officer/data-mode";
import type { MapZone } from "@/lib/services/officer/map";

export interface SignalMapProps {
  dataMode?: OfficerDataMode;
  zones: MapZone[];
  viewport: MapViewport;
  selectedZone: MapZone | null;
  onSelect: (zone: MapZone | null) => void;
}

const ACTIVITY_COLOR: Record<string, string> = {
  high: "#C63C3C",
  moderate: "#D99000",
  low: "#20BFD0",
  none: "#9CA3AF",
};

function FitBounds({ viewport }: { viewport: MapViewport }) {
  const map = useMap();
  useEffect(() => {
    map.setMinZoom(0);
    const bounds = viewport.bounds ? latLngBounds(viewport.bounds) : null;
    if (bounds?.isValid()) {
      map.setMaxBounds(bounds);
      map.fitBounds(bounds, {
        padding: [16, 16],
        maxZoom: viewport.zoom,
        animate: false,
      });
      map.setMinZoom(map.getZoom());
    } else {
      map.setView(viewport.center, viewport.zoom, { animate: false });
      map.setMinZoom(viewport.zoom);
    }
    // Centroid envelopes are not legal boundaries. Until real boundaries exist,
    // keep the fallback centered: no dragging, keyboard panning or zooming out.
    if (!viewport.exactBoundary) {
      map.dragging.disable();
      map.keyboard.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.touchZoom.disable();
      map.boxZoom.disable();
    }
  }, [map, viewport]);
  return null;
}

/** Clear zone selection when clicking the map background. */
function BackgroundClickHandler({
  onSelect,
}: {
  onSelect: (zone: MapZone | null) => void;
}) {
  useMapEvents({
    click: () => onSelect(null),
  });
  return null;
}

function radiusMeters(zone: MapZone) {
  return Math.max(zone.radius * 1000, 300);
}

/**
 * Keep Leaflet's cached container size in sync with its real layout size.
 *
 * Leaflet measures the container once at `MapContainer` init and caches that
 * size; it only re-measures on a window `resize` or an explicit
 * `invalidateSize()`. In a fluid layout the container can be measured before
 * the final size settles (initial paint, webfonts, image loads) and always
 * changes when the sidebar collapses/expands or a responsive breakpoint flips —
 * both leave stale tiles covering only part of the map panel. A ResizeObserver
 * on the container makes every real size change trigger `invalidateSize()`.
 */
function MapSizeSync() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    let rafId: number | undefined;
    const scheduleInvalidate = () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = undefined;
        map.invalidateSize();
      });
    };

    // Re-measure once rendering has settled instead of trusting the size that
    // was captured at init (the reported "tiny map in a grey box" symptom).
    rafId = requestAnimationFrame(scheduleInvalidate);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Skip while genuinely hidden; the observer will fire again once the
        // container has real dimensions.
        if (entry.contentRect.width === 0 && entry.contentRect.height === 0) {
          continue;
        }
        scheduleInvalidate();
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (rafId != null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [map]);

  return null;
}

export function SignalMap({
  dataMode = "live",
  zones,
  viewport,
  selectedZone,
  onSelect,
}: SignalMapProps) {
  const safeZones = zones.filter(
    (zone) =>
      (dataMode === "demo"
        ? zone.source === "demo"
        : !zone.source && !zone.suppressed) &&
      validMapPoint(zone.lat, zone.lng) &&
      Number.isFinite(zone.radius) &&
      zone.radius > 0,
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl ring-1 ring-foreground/10"
      style={{ height: "100%", width: "100%" }}
    >
      <MapContainer
        center={viewport.center}
        zoom={viewport.zoom}
        maxZoom={18}
        maxBoundsViscosity={1}
        scrollWheelZoom
        zoomControl
        className="h-full w-full"
        style={{ height: "100%", width: "100%", minHeight: 240, zIndex: 0 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
          attribution='Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors (ODbL), tiles &copy; <a href="https://www.openstreetmap.fr/">OpenStreetMap France</a> (CC BY-SA)'
        />

        <FitBounds viewport={viewport} />
        <BackgroundClickHandler onSelect={onSelect} />
        <MapSizeSync />

        {safeZones.map((zone) => {
          const color = ACTIVITY_COLOR[zone.activityLevel];
          const isSelected = selectedZone?.zoneId === zone.zoneId;

          return (
            <Circle
              key={zone.zoneId}
              center={[zone.lat, zone.lng]}
              radius={radiusMeters(zone)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: zone.suppressed ? 0.15 : isSelected ? 0.5 : 0.3,
                opacity: isSelected ? 1 : zone.suppressed ? 0.5 : 0.8,
                weight: isSelected ? 3 : 1,
              }}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation();
                  onSelect(zone);
                },
              }}
            >
              <Tooltip>
                {zone.name}:{" "}
                {zone.suppressed
                  ? "Insufficient aggregated data"
                  : `${zone.reportCount} aggregate reports`}
              </Tooltip>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
}
