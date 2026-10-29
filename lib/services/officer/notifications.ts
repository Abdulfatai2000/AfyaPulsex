/**
 * Officer notifications — typed frontend adapter (single frontend service).
 *
 * Both the header notification bell and the Notifications / Alerts Center
 * consume ONLY the types and functions exported here, so read state and tab
 * counts stay in sync. Backend developers replace the mock bodies without
 * touching any React component.
 *
 * PRIVACY CONTRACT (DEV4): notifications are officer-facing operational
 * summaries — aggregate signals and organization events. Descriptions never
 * name citizens, and never expose citizen ids, phone numbers, exact addresses,
 * or individual health information.
 *
 * SECURITY / BACKEND BOUNDARY:
 * - No MongoDB access and no backend authorization live here. The real adapter
 *   is authorized server-side and replaces the mock implementation while
 *   keeping this interface. Auth outcomes (unauthorized / session-expired) are
 *   driven by the route/session boundary, not by this mock adapter.
 * - Destinations come from each notification's own `href` — the UI never
 *   hardcodes a single routing target.
 *
 * TODO(DEV3): replace the mock feed + read-state with the real notifications
 *   service (persisted, authorized, push-delivered). Keep this interface.
 */

export type NotificationKind = "urgent" | "warning" | "info";

export type NotificationCategory =
  | "access-request"
  | "health-signal"
  | "investigation"
  | "system";

export type NotificationTab = "all" | NotificationCategory;

export interface OfficerNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  /** Aggregate, officer-facing operational summary (never citizen records). */
  description: string;
  kind: NotificationKind;
  unread: boolean;
  timestamp: string;
  /** Notification-provided destination (e.g. /officer/warnings/w-001). */
  href: string;
  actionLabel: "View" | "Review";
}

export interface GetNotificationsParams {
  category?: NotificationTab;
  page?: number;
  limit?: number;
}

export interface NotificationTabCounts {
  all: number;
  accessRequest: number;
  healthSignal: number;
  investigation: number;
  system: number;
}

export interface NotificationsPage {
  items: OfficerNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: NotificationTabCounts;
}

export type NotificationsDataStatus =
  | "loading"
  | "ready"
  | "empty"
  | "unauthorized"
  | "session-expired"
  | "error";

export class NotificationsServiceError extends Error {
  constructor(
    public code: "unauthorized" | "network",
    message?: string,
  ) {
    super(message);
    this.name = "NotificationsServiceError";
  }
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const NOTIFICATION_TABS: ReadonlyArray<{
  value: NotificationTab;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "access-request", label: "Access Requests" },
  { value: "health-signal", label: "Health Signals" },
  { value: "investigation", label: "Investigations" },
  { value: "system", label: "System" },
];

/**
 * Mock feed — TODO(DEV3): replace with the real notifications service.
 * 6 aggregate, privacy-safe placeholders behind the service boundary. Read
 * state lives here (mutable) solely so the adapter behaves like a real store
 * while the backend is built out; the backend owns read state in production.
 */
const MOCK_NOTIFICATIONS: OfficerNotification[] = [
  {
    id: "n-001",
    category: "health-signal",
    title: "Fever signal above baseline",
    description: "Fever reporting is above the 7-day baseline across Osun State.",
    kind: "urgent",
    unread: true,
    timestamp: "2026-09-23T09:12:00Z",
    href: "/officer/warnings/w-001",
    actionLabel: "View",
  },
  {
    id: "n-002",
    category: "access-request",
    title: "Access request awaiting approval",
    description: "A pending officer access request needs your review.",
    kind: "info",
    unread: true,
    timestamp: "2026-09-23T08:40:00Z",
    href: "/officer/approvals",
    actionLabel: "Review",
  },
  {
    id: "n-003",
    category: "health-signal",
    title: "Cough activity above recent baseline",
    description: "Cough reporting is elevated in Ife Central and surrounding LGAs.",
    kind: "warning",
    unread: true,
    timestamp: "2026-09-22T22:15:00Z",
    href: "/officer/warnings/w-003",
    actionLabel: "View",
  },
  {
    id: "n-004",
    category: "investigation",
    title: "Investigation moved to Escalated",
    description: "Investigation INV-104 progressed to the Escalated stage.",
    kind: "info",
    unread: false,
    timestamp: "2026-09-21T07:00:00Z",
    href: "/officer/investigations/inv-104",
    actionLabel: "View",
  },
  {
    id: "n-005",
    category: "health-signal",
    title: "Respiratory cases rising in Ife East",
    description: "Respiratory reporting trended upward across Ife East this week.",
    kind: "warning",
    unread: false,
    timestamp: "2026-09-20T18:30:00Z",
    href: "/officer/warnings/w-006",
    actionLabel: "View",
  },
  {
    id: "n-006",
    category: "health-signal",
    title: "Unusual cluster reported in Ilesha West",
    description: "An unusual symptom cluster is under review in Ilesha West.",
    kind: "urgent",
    unread: true,
    timestamp: "2026-09-19T11:05:00Z",
    href: "/officer/explorer",
    actionLabel: "View",
  },
];

const STORE: OfficerNotification[] = [...MOCK_NOTIFICATIONS];

const NOTIFICATION_COUNT_BY_CATEGORY = (
  category: NotificationCategory,
): number => STORE.filter((item) => item.category === category).length;

function buildCounts(): NotificationTabCounts {
  return {
    all: STORE.length,
    accessRequest: NOTIFICATION_COUNT_BY_CATEGORY("access-request"),
    healthSignal: NOTIFICATION_COUNT_BY_CATEGORY("health-signal"),
    investigation: NOTIFICATION_COUNT_BY_CATEGORY("investigation"),
    system: NOTIFICATION_COUNT_BY_CATEGORY("system"),
  };
}

/* ------------------------------------------------------------------ *
 * Change subscription (keeps the header bell in sync with the center
 * without ever creating a second notification system).
 * ------------------------------------------------------------------ */

type ChangeListener = () => void;
const listeners = new Set<ChangeListener>();

/** Subscribe to notification changes (read-state etc.). Returns unsubscribe. */
export function subscribeNotifications(listener: ChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

/* ------------------------------------------------------------------ *
 * Center API.
 * ------------------------------------------------------------------ */

/**
 * Paginated notifications filtered by tab, newest first, with the per-tab
 * counts for the center's filter row.
 *
 * TODO(DEV3): real pagination + category filters live server-side.
 * TODO(DEV4): authorize the query against the officer session at the boundary.
 */
export async function getNotifications({
  category = "all",
  page = 1,
  limit = 10,
}: GetNotificationsParams = {}): Promise<NotificationsPage> {
  await delay(320);
  const normalizedPage = Math.max(1, page);
  const normalizedLimit = Math.max(1, limit);
  const filtered =
    category === "all"
      ? STORE
      : STORE.filter((item) => item.category === category);
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
    counts: buildCounts(),
  };
}

/**
 * Mark a notification as read (optimistic-known: the mock store reflects it
 * immediately so the bell and center agree). Backend replaces this with a
 * persisted, authorized mutation keeping the same signature.
 */
export async function markNotificationAsRead(
  notificationId: string,
): Promise<OfficerNotification> {
  await delay(120);
  const item = STORE.find((entry) => entry.id === notificationId);
  if (!item) {
    throw new Error(`Notification "${notificationId}" was not found.`);
  }
  if (item.unread) {
    item.unread = false;
    notifyChange();
  }
  return { ...item };
}

/**
 * Derive the list status from a loaded page. Loading/error states are driven
 * by the fetch lifecycle; empty reflects a tab with no notifications.
 */
export function deriveNotificationsStatus(
  itemsCount: number,
): "ready" | "empty" {
  return itemsCount === 0 ? "empty" : "ready";
}

/* ------------------------------------------------------------------ *
 * Bell API (unchanged surface; same data store so counts stay consistent).
 * ------------------------------------------------------------------ */

/**
 * Latest officer notifications, newest first, for the header bell.
 */
export async function getOfficerNotifications(
  limit = 5,
): Promise<OfficerNotification[]> {
  void limit;
  await delay(250);
  return [...STORE]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

/**
 * Unread notification count shown on the bell indicator — derived from the
 * same store as the center.
 * TODO(DEV3): derive from the real, authorized notifications service.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  await delay(120);
  return STORE.filter((item) => item.unread).length;
}