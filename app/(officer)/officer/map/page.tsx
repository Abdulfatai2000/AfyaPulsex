/**
 * Officer Live Signal Map — route shell.
 *
 * The interactive map uses react-leaflet, which is browser-only and must never
 * be server-rendered. In Next 16, `next/dynamic`'s `ssr: false` option is NOT
 * permitted inside a Server Component, so the client-only boundary (including
 * the lazy Leaflet bundle) lives in the `MapPageClient` component. This route
 * shell remains server-rendered for the heading and streams in the client UI.
 *
 * TODO(DEV4): Enforce route-level authorization (officers only) and the
 *   jurisdiction boundary at the server boundary before this page renders.
 */

import { getOfficerMapContext } from "@/server/services/officer-map-scope";
import MapPageClient from "@/components/officer/map/MapPageClient";
import { getServerDataMode } from "@/lib/services/officer/data-mode-server";

export default async function MapPage() {
  // Centralized Data Mode: the key remounts the client on Demo/Live switches
  // (set by DataModeProvider via session cookie + router.refresh()).
  const mode = await getServerDataMode();
  const { scope } = await getOfficerMapContext();
  return (
    <section className="flex flex-col gap-4 min-w-0">
      <div>
        <h1 className="text-2xl font-bold text-deep-navy">Live Signal Map</h1>
        <p className="text-sm text-muted-foreground">
          Aggregate disease activity by zone within your jurisdiction. Select
          filters to narrow the view, then click a zone for details.
        </p>
      </div>
      <MapPageClient key={mode} scope={scope} />
    </section>
  );
}
