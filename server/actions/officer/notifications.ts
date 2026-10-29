// Dev 3 owns this file. Officer notifications boundary — the header bell feed.
"use server";
import { requireLiveOfficer as requireApprovedOfficer } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { Notification } from "@/server/models";
import { listNotifications, countUnreadNotifications } from "@/server/services/notifications";
import { docIdString } from "@/server/lib/id-utils";
import type { OfficerNotification } from "@/lib/services/officer/notifications";

const DEFAULT_LIMIT = 5;

function toNotificationKind(type: string): OfficerNotification["kind"] {
  if (type === "alert") return "urgent";
  if (type === "warning") return "warning";
  return "info";
}

function toOfficerNotification(
  doc: Awaited<ReturnType<typeof listNotifications>>[number],
): OfficerNotification {
  const type = doc.type;
  let category: OfficerNotification["category"] = "system";
  let actionLabel: OfficerNotification["actionLabel"] = "View";

  if (type === "alert" || type === "warning") {
    category = "health-signal";
    actionLabel = "View";
  } else if (type === "approval") {
    category = "access-request";
    actionLabel = "Review";
  }

  return {
    id: docIdString(doc),
    category,
    title: doc.title,
    description: doc.body || "",
    kind: toNotificationKind(type),
    unread: !doc.readAt,
    timestamp: (doc.sentAt ?? doc.createdAt).toISOString(),
    href: (doc.metadata as { href?: string } | undefined)?.href ?? "/officer",
    actionLabel,
  };
}

export async function getOfficerNotificationsAction(
  limit: number = DEFAULT_LIMIT,
): Promise<OfficerNotification[]> {
  const session = await requireApprovedOfficer();
  const docs = await listNotifications(session.userId, { limit });
  return docs.map(toOfficerNotification);
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const session = await requireApprovedOfficer();
  return countUnreadNotifications(session.userId);
}

/**
 * Persistently mark one notification as read. Scoped to the session user's
 * own notifications server-side: an officer can only acknowledge their own
 * feed, never another user's. Throws when the notification does not exist
 * or does not belong to the current officer.
 */
export async function markNotificationAsReadAction(
  notificationId: string,
): Promise<OfficerNotification> {
  const session = await requireApprovedOfficer();
  await connectDB();
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, user: session.userId, simulation: { $ne: true } },
    { readAt: new Date() },
    { new: true },
  ).lean();
  if (!updated) {
    throw new Error("Notification not found");
  }
  return toOfficerNotification(updated);
}
