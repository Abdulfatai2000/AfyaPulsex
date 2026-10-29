"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  CreatePublicAlertInput,
  PublicAlertSummaryCounts,
  PublicAlertTab,
} from "@/lib/services/officer/public-alerts";
import {
  DEFAULT_FILTERS,
  PublicAlertsServiceError,
  TABS,
  createPublicAlert,
  derivePublicAlertStatus,
  getPublicAlertSummary,
  getPublicAlerts,
} from "@/lib/services/officer/public-alerts";
import type {
  PublicAlertDataStatus,
  PublicAlertRecord,
} from "@/lib/services/officer/public-alerts";
import {
  resolveOfficerData,
  mapFetchErrorStatus,
} from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import {
  createPublicAlertLive,
  getPublicAlertSummaryLive,
  getPublicAlertsLive,
} from "@/lib/services/officer/live-adapters";
import { PublicAlertStatusTabs } from "./PublicAlertStatusTabs";
import { PublicAlertTable } from "./PublicAlertTable";
import { PublicAlertForm } from "./PublicAlertForm";

const VALID_TABS: ReadonlyArray<PublicAlertTab> = TABS.map((tab) => tab.value);

function mapTabParam(value: string | null): PublicAlertTab {
  return VALID_TABS.includes(value as PublicAlertTab)
    ? (value as PublicAlertTab)
    : DEFAULT_FILTERS.tab;
}

export default function PublicAlertCenterClient() {
  const { mode } = useDataMode();
  const searchParams = useSearchParams();
  const requestedTab = mapTabParam(searchParams.get("tab"));

  const [tab, setTab] = useState<PublicAlertTab>(requestedTab);
  const [alerts, setAlerts] = useState<PublicAlertRecord[]>([]);
  const [status, setStatus] = useState<PublicAlertDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PublicAlertSummaryCounts | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(
    (next: PublicAlertTab) => {
      // Live returns authorized drafts and published alerts.
      resolveOfficerData(mode, {
        demo: () => getPublicAlerts(next, DEFAULT_FILTERS.stateId),
        live: () => getPublicAlertsLive(next),
      })
        .then((data) => {
          setAlerts(data);
          setStatus(derivePublicAlertStatus(data));
          setError(null);
        })
        .catch((err: unknown) => {
          const mapped = mapFetchErrorStatus(err, PublicAlertsServiceError);
          if (mapped === "unauthorized") {
            setStatus("unauthorized");
          } else if (mapped === "session-expired") {
            setStatus("session-expired");
          } else {
            setStatus("error");
            setError(
              err instanceof Error
                ? err.message
                : "Something went wrong loading public alerts.",
            );
          }
        });
    },
    [mode],
  );

  const loadSummary = useCallback(() => {
    void resolveOfficerData(mode, {
      demo: () => getPublicAlertSummary(DEFAULT_FILTERS.stateId),
      live: () => getPublicAlertSummaryLive(),
    })
      .then((counts) => setSummary(counts))
      .catch(() => setSummary(null));
  }, [mode]);

  // Load the initial view (honours ?tab=...) plus the jurisdiction-wide tab
  // counts. All state updates happen inside async callbacks, never in the
  // effect body.
  useEffect(() => {
    void load(requestedTab);
  }, [load, requestedTab]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleTabChange = (next: PublicAlertTab) => {
    setTab(next);
    setStatus("loading");
    void load(next);
  };

  const handleCreate = async (input: CreatePublicAlertInput) => {
    const created =
      mode === "live"
        ? await createPublicAlertLive(input)
        : await createPublicAlert(input);
    // A new alert is authored as a Draft; if we're on Draft it appears
    // immediately, otherwise counts refresh so the user can navigate to it.
    void load(tab);
    loadSummary();
    return created;
  };

  const activeTabLabel =
    TABS.find((item) => item.value === tab)?.label ?? "Draft";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <PublicAlertStatusTabs
            value={tab}
            onChange={handleTabChange}
            counts={summary}
          />
        </div>
        <Button
          className="w-fit shrink-0"
          onClick={() => setCreateOpen(true)}
          type="button"
        >
          <Plus aria-hidden="true" />
          Create New Alert
        </Button>
      </div>

      <PublicAlertTable
        alerts={alerts}
        status={status}
        tabLabel={activeTabLabel}
        error={error}
        onRetry={() => handleTabChange(tab)}
        onReset={() => handleTabChange(DEFAULT_FILTERS.tab)}
      />

      <Dialog
        open={createOpen}
        onOpenChange={(next) => {
          if (next) {
            setCreateOpen(true);
          } else {
            setCreateOpen(false);
          }
        }}
      >
        {createOpen ? (
          <DialogContent>
            <PublicAlertForm
              onSubmit={handleCreate}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
