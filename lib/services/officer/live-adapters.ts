/**
 * Officer Portal — Live adapters.
 *
 * The "live" half of the centralized Data Mode abstraction. Each adapter calls
 * the existing real backend (server actions with server-side auth, RBAC,
 * jurisdiction scoping, and privacy thresholds) and returns the SAME frontend
 * types as the demo services, so pages stay unchanged.
 *
 * Rules:
 * - Never import demo/mock services here and never return sample data.
 * - Domains without a real backend endpoint yet reject via `unavailableLive`,
 *   which drives the page's existing error state ("Unable to load live data.
 *   Please try again."). This is reported as a backend dependency, not a
 *   silent fallback.
 * - No MongoDB access from here beyond what the server actions already do
 *   server-side. No secrets are referenced; safe for client imports.
 */

import {
  getDashboardMetricsAction,
  getMapPreviewSummaryAction,
  getRecentAlertsAction,
  getTopSymptomsAction,
  getWhatChangedTodayAction,
} from "@/server/actions/officer/dashboard";
import {
  addInvestigationNoteAction,
  getInvestigationByIdAction,
  getInvestigationSummaryAction,
  getInvestigationsAction,
  setInvestigationAssignedToAction,
  setInvestigationStatusAction,
} from "@/server/actions/officer/investigations";
import {
  getOfficerNotificationsAction,
  getUnreadNotificationCountAction,
} from "@/server/actions/officer/notifications";
import {
  getOfficerPublicAlertsAction,
  createPublicAlertAction,
} from "@/server/actions/officer/public-alerts";
import { getActiveWarningsAction } from "@/server/actions/officer/signals";
import type { WarningFilters } from "./warnings";
import { getOfficerProfileAction } from "@/server/actions/officer/profile";
import { unavailableLive } from "./data-mode";
import type {
  AlertSummary,
  DashboardMetrics,
  MapPreviewSummary,
  SymptomSummary,
  Timeframe,
  WhatChangedToday,
} from "./dashboard";
import type { MapZone, MapFilters } from "./map";
import type {
  Investigation,
  InvestigationDetail,
  InvestigationFilters,
  InvestigationStatus,
  InvestigationSummaryCounts,
} from "./investigations";
import type {
  GetNotificationsParams,
  NotificationTabCounts,
  NotificationsPage,
  OfficerNotification,
} from "./notifications";
import type {
  PublicAlertDetail,
  PublicAlertRecord,
  PublicAlertSummaryCounts,
  PublicAlertTab,
} from "./public-alerts";
import type { OfficerProfile } from "./profile";

/* ------------------------------------------------------------------ *
 * Officer profile — identity read backed by the real session/profile
 * boundary. The backend has no photo-upload endpoint and returns no photo
 * URL yet, so `avatarUrl` resolves empty in Live mode (initials fallback)
 * until the backend ships photo storage + URL.
 * ------------------------------------------------------------------ */

export async function getOfficerProfileLive(): Promise<OfficerProfile> {
  const dto = await getOfficerProfileAction();
  return {
    name: dto.name,
    role: dto.role,
    email: dto.email,
    phone: undefined,
    organization: dto.organization,
    jurisdiction: dto.jurisdiction,
    // No backend photo URL exists yet — empty keeps the initials fallback.
    avatarUrl: "",
    verificationStatus: dto.verificationStatus,
    active: dto.active,
  };
}

/** Photo upload has no live backend endpoint yet → professional error state. */
export function uploadOfficerProfilePhotoLive(): Promise<never> {
  return unavailableLive("profile-photo upload");
}

/** Photo removal has no live backend endpoint yet → professional error state. */
export function removeOfficerProfilePhotoLive(): Promise<never> {
  return unavailableLive("profile-photo removal");
}

/* ------------------------------------------------------------------ *
 * Overview (dashboard) — fully backed by existing server actions.
 * ------------------------------------------------------------------ */

export function getDashboardMetricsLive(
  timeframe: Timeframe,
): Promise<DashboardMetrics> {
  return getDashboardMetricsAction(timeframe);
}

export function getMapPreviewSummaryLive(): Promise<MapPreviewSummary> {
  return getMapPreviewSummaryAction();
}

export function getTopSymptomsLive(
  timeframe: Timeframe,
): Promise<SymptomSummary[]> {
  return getTopSymptomsAction(timeframe);
}

export function getRecentAlertsLive(): Promise<AlertSummary[]> {
  return getRecentAlertsAction();
}

export function getWhatChangedTodayLive(): Promise<WhatChangedToday> {
  return getWhatChangedTodayAction();
}

/* ------------------------------------------------------------------ *
 * Investigations — fully backed by existing server actions.
 * ------------------------------------------------------------------ */

export function getInvestigationSummaryLive(
  stateId?: string,
): Promise<InvestigationSummaryCounts> {
  return getInvestigationSummaryAction(stateId);
}

export function getInvestigationsLive(
  filters: InvestigationFilters,
): Promise<Investigation[]> {
  return getInvestigationsAction(filters);
}

export function getInvestigationByIdLive(
  id: string,
): Promise<InvestigationDetail | null> {
  return getInvestigationByIdAction(id);
}

export function setInvestigationStatusLive(
  id: string,
  status: InvestigationStatus,
): Promise<InvestigationDetail | null> {
  return setInvestigationStatusAction(id, status);
}

export function setInvestigationAssignedToLive(
  id: string,
  assignment: string,
): Promise<InvestigationDetail | null> {
  return setInvestigationAssignedToAction(id, assignment);
}

export function addInvestigationNoteLive(
  id: string,
  body: string,
): Promise<InvestigationDetail | null> {
  return addInvestigationNoteAction(id, body);
}

/* ------------------------------------------------------------------ *
 * Notifications — feed backed by the real notifications service.
 * Read-state persists via the notifications boundary (Notification.readAt);
 * a session-local acknowledgment remains only as a fallback when the
 * persistent write fails.
 * ------------------------------------------------------------------ */

type LiveChangeListener = () => void;

const liveListeners = new Set<LiveChangeListener>();
const acknowledgedThisSession = new Set<string>();

/** Subscribe to live notification acknowledgments (bell ↔ center sync). */
export function subscribeLiveNotifications(
  listener: LiveChangeListener,
): () => void {
  liveListeners.add(listener);
  return () => {
    liveListeners.delete(listener);
  };
}

function notifyLiveChange(): void {
  for (const listener of liveListeners) {
    listener();
  }
}

function applyAcknowledged(
  items: OfficerNotification[],
): OfficerNotification[] {
  return items.map((item) =>
    acknowledgedThisSession.has(item.id) ? { ...item, unread: false } : item,
  );
}

function buildLiveCounts(items: OfficerNotification[]): NotificationTabCounts {
  const count = (category: OfficerNotification["category"]) =>
    items.filter((item) => item.category === category).length;
  return {
    all: items.length,
    accessRequest: count("access-request"),
    healthSignal: count("health-signal"),
    investigation: count("investigation"),
    system: count("system"),
  };
}

export async function getNotificationsLive({
  category = "all",
  page = 1,
  limit = 10,
}: GetNotificationsParams = {}): Promise<NotificationsPage> {
  const feed = applyAcknowledged(await getOfficerNotificationsAction(100));
  const normalizedPage = Math.max(1, page);
  const normalizedLimit = Math.max(1, limit);
  const filtered =
    category === "all"
      ? feed
      : feed.filter((item) => item.category === category);
  const sorted = [...filtered].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));
  const safePage = Math.min(normalizedPage, totalPages);
  const start = (safePage - 1) * normalizedLimit;
  return {
    items: sorted.slice(start, start + normalizedLimit),
    total,
    page: safePage,
    limit: normalizedLimit,
    totalPages,
    counts: buildLiveCounts(feed),
  };
}

export async function getOfficerNotificationsFeedLive(
  limit = 5,
): Promise<OfficerNotification[]> {
  const feed = applyAcknowledged(await getOfficerNotificationsAction(limit));
  return [...feed]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export async function getUnreadNotificationCountLive(): Promise<number> {
  try {
    const unread = await getUnreadNotificationCountAction();
    return unread;
  } catch {
    // Fall back to deriving from the feed so a count-only failure still
    // reflects session acknowledgments; feed errors propagate to the caller.
    const feed = await getOfficerNotificationsFeedLive(100);
    return feed.filter((item) => item.unread).length;
  }
}

/**
 * Persistent read-state backed by the notifications service: the item is
 * marked read in the database for the session user, so the bell count and
 * the center stay read across sessions. Falls back to the session-local
 * acknowledgment when the persistent write fails (existing behavior).
 */
export async function markNotificationAsReadLive(
  notificationId: string,
): Promise<OfficerNotification> {
  try {
    const { markNotificationAsReadAction } =
      await import("@/server/actions/officer/notifications");
    const updated = await markNotificationAsReadAction(notificationId);
    notifyLiveChange();
    return updated;
  } catch {
    const feed = await getOfficerNotificationsAction(100);
    const item = feed.find((entry) => entry.id === notificationId);
    if (!item) {
      throw new Error(`Notification "${notificationId}" was not found.`);
    }
    acknowledgedThisSession.add(notificationId);
    notifyLiveChange();
    return { ...item, unread: false };
  }
}

/* ------------------------------------------------------------------ *
 * Public alerts: authorized draft and published records from MongoDB.
 * ------------------------------------------------------------------ */

export async function getPublicAlertSummaryLive(): Promise<PublicAlertSummaryCounts> {
  const alerts = await getOfficerPublicAlertsAction();
  return {
    draft: alerts.filter((alert) => alert.status === "draft").length,
    published: alerts.filter((alert) => alert.status === "published").length,
    underReview: 0,
    expired: 0,
  };
}
export async function getPublicAlertsLive(
  tab: PublicAlertTab,
): Promise<PublicAlertRecord[]> {
  return (await getOfficerPublicAlertsAction()).filter(
    (alert) => alert.status === tab,
  );
}
export async function getPublicAlertDetailLive(
  id: string,
): Promise<PublicAlertDetail | null> {
  return (await getOfficerPublicAlertsAction(id))[0] ?? null;
}
export function getWarningByIdLive(id: string) {
  return getActiveWarningsAction(undefined, id).then((rows) => rows[0] ?? null);
}
export async function getWarningSummaryLive() {
  const rows = await getActiveWarningsAction();
  return {
    active: rows.length,
    requiresReview: rows.length,
    monitoring: 0,
    escalated: 0,
  };
}

/* ------------------------------------------------------------------ *
 * Domains without a connected live endpoint yet.
 * Each rejects so the page renders its error state — never demo data.
 * Backend dependency (DEV3/DEV4): connect these to the authorized pipeline.
 * ------------------------------------------------------------------ */

/** Signal Map aggregate zones. */
export async function getMapDataLive(filters?: MapFilters): Promise<MapZone[]> {
  const { getOfficerMapDataAction } = await import("@/server/actions/officer/map");
  const { DEFAULT_FILTERS } = await import("@/lib/services/officer/map");
  return getOfficerMapDataAction(filters ?? DEFAULT_FILTERS);
}

/** Signal Explorer aggregate groups. */
export function getExplorerDataLive(): Promise<never> {
  return unavailableLive("explorer");
}

/** Early-warning signals. */
export function getWarningsLive(filters?: Partial<WarningFilters>) {
  return getActiveWarningsAction(filters);
}

/** Analytics aggregates (symptoms, conditions, demographics, trends, …). */
export function getAnalyticsLive(): Promise<never> {
  return unavailableLive("analytics");
}

/** Response records and workflow mutations. */
export function getResponsesLive(): Promise<never> {
  return unavailableLive("response");
}

/** Reports catalog and generation. */
export function getReportsLive(): Promise<never> {
  return unavailableLive("reports");
}

/** Public-alert authoring (draft creation has no live endpoint yet). */
export const createPublicAlertLive = createPublicAlertAction;
