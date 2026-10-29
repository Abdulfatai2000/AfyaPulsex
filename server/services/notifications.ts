// Dev 3 owns this service. In-app notifications.
import "server-only";
import { accountRecordFilter } from "./account-environment";
import { connectDB } from "@/server/db/connection";
import { Notification } from "@/server/models";
import type { QueryFilter } from "mongoose";
import { omitMeta } from "@/server/lib/model-utils";
import { safeLimit } from "@/server/lib/pagination";

export async function sendNotification(
  userId: string,
  input: Partial<Notification>,
): Promise<Notification> {
  await connectDB();
  const doc = await Notification.create({ user: userId, ...omitMeta(input) });
  return doc.toObject();
}

export async function listNotifications(
  userId: string,
  opts?: { unreadOnly?: boolean; limit?: number },
): Promise<Notification[]> {
  await connectDB();
  const query: QueryFilter<Notification> = { user: userId, ...await accountRecordFilter(userId) };
  if (opts?.unreadOnly) query.readAt = null;
  const limit = safeLimit(opts?.limit);
  return Notification.find(query).sort({ sentAt: -1 }).limit(limit).lean();
}
