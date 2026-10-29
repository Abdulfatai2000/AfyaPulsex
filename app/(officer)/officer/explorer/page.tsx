/**
 * Officer Signal Explorer — route shell.
 *
 * The interactive explorer is a client component. Geography seeds from the URL
 * (?stateId, ?lgaId) are validated by the explorer service: an unknown State,
 * or an LGA that does not belong to the selected State, surfaces as a
 * restricted-jurisdiction state in the client rather than a raw error page.
 *
 * The `key` on the client forces a fresh explorer instance when the seeds
 * change during client-side navigation.
 *
 * TODO(DEV4): Enforce route-level authorization (officers only) and the
 *   jurisdiction boundary at the server boundary before this page renders.
 */

import ExplorerPageClient from "@/components/officer/explorer/ExplorerPageClient";
import { getServerDataMode } from "@/lib/services/officer/data-mode-server";

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ stateId?: string; lgaId?: string }>;
}) {
  const params = await searchParams;
  const stateId = params?.stateId;
  const lgaId = params?.lgaId;
  // Centralized Data Mode: the key also remounts on Demo/Live switches.
  const mode = await getServerDataMode();

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-deep-navy">Signal Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Aggregate signal groups within your jurisdiction. Filter by location,
          symptom, condition, demographics, and reporting channel to explore
          elevated activity over the selected window.
        </p>
      </div>
      <ExplorerPageClient
        key={`${stateId ?? ""}::${lgaId ?? ""}::${mode}`}
        defaultStateId={stateId}
        defaultLgaId={lgaId}
      />
    </section>
  );
}