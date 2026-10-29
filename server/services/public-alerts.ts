// Dev 3 owns this service. Public alert publishing (multi-channel).
// Channel delivery (sms/email) is Dev 4 optional via Resend.
import "server-only";
import { connectDB } from "@/server/db/connection";
import { PublicAlert } from "@/server/models";
import type { QueryFilter } from "mongoose";
import { omitMeta } from "@/server/lib/model-utils";
import { safeLimit, safeOffset } from "@/server/lib/pagination";

export async function publishAlert(
  input: Partial<PublicAlert>,
): Promise<PublicAlert> {
  await connectDB();
  const { status, ...rest } = omitMeta(input);
  const resolvedStatus = status ?? "draft";
  const doc = await PublicAlert.create({
    ...rest,
    status: resolvedStatus,
    publishedAt: resolvedStatus === "published" ? new Date() : undefined,
  });
  return doc.toObject();
}

export async function listPublicAlerts(
  jurisdictionId?: string,
  opts?: { page?: number; limit?: number },
): Promise<PublicAlert[]> {
  await connectDB();
  const limit = safeLimit(opts?.limit);
  const offset = safeOffset(opts?.page, limit);
  const query: QueryFilter<PublicAlert> = { simulation: { $ne: true } };
  if (jurisdictionId) query.jurisdiction = jurisdictionId;
  return PublicAlert.find(query)
    .sort({ publishedAt: -1, createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}

/** Public projection and publication rules are applied in the query, before pagination. */
export async function publishedCitizenFeed(jurisdictionIds: string[], isDemo = false) {
  await connectDB();
  const { Jurisdiction } = await import("@/server/models");
  const docs = await PublicAlert.find({
    jurisdiction: { $in: jurisdictionIds },
    status: "published",
    channels: "web",
    simulation: isDemo ? true : { $ne: true },
    publishedAt: { $lte: new Date(), $ne: null },
  })
    .select("title body level jurisdiction publishedAt updatedAt issuedBy")
    .sort({ publishedAt: -1 })
    .limit(100)
    .lean();
  return Promise.all(
    docs.map(async (alert) => {
      const area = await Jurisdiction.findById(alert.jurisdiction)
        .select("name")
        .lean();
      return {
        id: String(alert._id),
        title: alert.title,
        summary: alert.body || alert.title,
        details: alert.body || alert.title,
        category:
          alert.level === "info"
            ? ("information" as const)
            : alert.level === "watch"
              ? ("advisory" as const)
              : ("important" as const),
        affectedArea: { label: area?.name ?? "Assigned area" },
        publishedAt: alert.publishedAt!.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
        ...(alert.issuedBy ? { issuedBy: alert.issuedBy } : {}),
        status: "published" as const,
      };
    }),
  );
}
