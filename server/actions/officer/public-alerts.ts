"use server";
import { requireLiveOfficer as requireApprovedOfficer, requireCapability } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import {
  PublicAlert,
  Jurisdiction,
  OfficerProfile,
  Organization,
} from "@/server/models";
import {
  patternForWarning,
  generateInsight,
  alertDraftSchema,
  AlertPipelineError,
} from "@/server/services/ai-insights";
import { z } from "zod";
import type { PublicAlertDetail } from "@/lib/services/officer/public-alerts";

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const editSchema = alertDraftSchema
  .extend({
    level: z.enum(["info", "watch", "warning", "critical"]),
    channels: z
      .array(z.enum(["sms", "push", "web", "ussd"]))
      .min(1)
      .max(4),
    audience: z.string().trim().max(120),
  })
  .strict();

export async function getOfficerPublicAlertsAction(
  id?: string,
): Promise<PublicAlertDetail[]> {
  const session = await requireApprovedOfficer();
  if (id) idSchema.parse(id);
  await connectDB();
  const docs = await PublicAlert.find({
    jurisdiction: { $in: session.jurisdictionIds },
    simulation: { $ne: true },
    status: { $in: ["draft", "published"] },
    ...(id ? { _id: id } : {}),
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  return Promise.all(
    docs.map(async (alert) => {
      const area = await Jurisdiction.findById(alert.jurisdiction).lean();
      const state =
        area?.level === "lga"
          ? await Jurisdiction.findById(area.parent).lean()
          : area;
      return {
        id: String(alert._id),
        title: alert.title,
        body: alert.body ?? "",
        level: alert.level,
        channels: alert.channels,
        status:
          alert.status === "published"
            ? ("published" as const)
            : ("draft" as const),
        publishedAt: alert.publishedAt?.toISOString() ?? null,
        createdAt: alert.createdAt.toISOString(),
        lastUpdated: alert.updatedAt.toISOString(),
        audience: alert.audience ?? "",
        stateId: state?.code ?? "",
        stateName: state?.name ?? "",
        lgaId: area?.level === "lga" ? area.code : null,
        lgaName: area?.level === "lga" ? area.name : null,
      };
    }),
  );
}

export async function generateAlertDraftAction(warningId: string) {
  const session = await requireCapability("public-alerts:write");
  idSchema.parse(warningId);
  try {
    const { warning, payload } = await patternForWarning(
      warningId,
      session.jurisdictionIds,
    );
    const draft = await generateInsight(payload);
    // Consent/eligibility may change while the external provider is responding.
    const refreshed = await patternForWarning(
      warningId,
      session.jurisdictionIds,
    );
    if (JSON.stringify(refreshed.payload) !== JSON.stringify(payload))
      throw new AlertPipelineError(
        "Pattern changed during generation. Please retry.",
      );
    const doc = await PublicAlert.create({
      ...draft,
      warning: warning._id,
      jurisdiction: warning.jurisdiction,
      level: "watch",
      channels: ["web"],
      status: "draft",
      createdBy: session.userId,
      simulation: false,
      audience: `${payload.lga ?? payload.state} residents`,
    });
    return { ok: true as const, id: String(doc._id) };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof AlertPipelineError
          ? error.message
          : "Unable to create the draft. Please try again.",
    };
  }
}

/** Save and publish are distinct operations; publishing requires the reviewed saved revision. */
export async function updatePublicAlertAction(input: {
  id: string;
  revision: string;
  title: string;
  body: string;
  level: "info" | "watch" | "warning" | "critical";
  channels: ("sms" | "push" | "web" | "ussd")[];
  audience: string;
}) {
  const session = await requireCapability("public-alerts:write");
  const { id, revision, ...copy } = input;
  idSchema.parse(id);
  z.iso.datetime().parse(revision);
  const fields = editSchema.parse(copy);
  await connectDB();
  const doc = await PublicAlert.findOneAndUpdate(
    {
      _id: id,
      jurisdiction: { $in: session.jurisdictionIds },
      status: "draft",
      simulation: { $ne: true },
      updatedAt: new Date(revision),
    },
    { $set: fields },
    { returnDocument: "after" },
  );
  return doc
    ? { ok: true as const }
    : {
        ok: false as const,
        error: "Draft changed or is unavailable. Reload before saving.",
      };
}

export async function publishPublicAlertAction(input: {
  id: string;
  revision: string;
}) {
  const session = await requireCapability("public-alerts:publish");
  idSchema.parse(input.id);
  z.iso.datetime().parse(input.revision);
  await connectDB();
  const officer = await OfficerProfile.findById(
    session.officerProfileId,
  ).lean();
  const organization = officer?.organization
    ? await Organization.findById(officer.organization).lean()
    : null;
  if (!organization?.name || organization.status !== "active")
    return {
      ok: false as const,
      error: "An issuing organization must be assigned before publishing.",
    };
  const draft = await PublicAlert.findOne({
    _id: input.id,
    jurisdiction: { $in: session.jurisdictionIds },
    status: "draft",
    simulation: { $ne: true },
    updatedAt: new Date(input.revision),
  }).lean();
  if (!draft)
    return {
      ok: false as const,
      error:
        "Draft changed or is unavailable. Reload and review it before publishing.",
    };
  const valid = editSchema.safeParse({
    title: draft.title,
    body: draft.body,
    level: draft.level,
    channels: draft.channels,
    audience: draft.audience ?? "",
  });
  if (!valid.success)
    return {
      ok: false as const,
      error:
        "Review and save a valid title, message and channel before publishing.",
    };
  if (draft.warning) {
    try {
      await patternForWarning(String(draft.warning), session.jurisdictionIds);
    } catch {
      return {
        ok: false as const,
        error:
          "The source pattern is no longer eligible. Publication is blocked.",
      };
    }
  }
  const doc = await PublicAlert.findOneAndUpdate(
    { _id: draft._id, status: "draft", updatedAt: draft.updatedAt },
    {
      $set: {
        status: "published",
        publishedAt: new Date(),
        publishedBy: session.userId,
        issuedBy: organization.name,
      },
    },
    { returnDocument: "after" },
  );
  return doc
    ? { ok: true as const }
    : {
        ok: false as const,
        error: "Draft changed. Reload and review before publishing.",
      };
}

export async function getAlertJurisdictionAction() {
  const session = await requireCapability("public-alerts:write");
  await connectDB();
  const root = await Jurisdiction.findById(session.jurisdictionIds[0]).lean();
  if (!root) throw new Error("Assigned jurisdiction unavailable.");
  const areas = await Jurisdiction.find({
    _id: { $in: session.jurisdictionIds.slice(1) },
    level: { $in: ["state", "lga"] },
  })
    .sort({ name: 1 })
    .lean();
  return {
    stateName: root.name,
    lgas: areas.map((area) => ({ id: String(area._id), name: area.name })),
  };
}
export async function createPublicAlertAction(input: {
  title: string;
  body: string;
  level: "info" | "watch" | "warning" | "critical";
  channels: ("sms" | "push" | "web" | "ussd")[];
  audience: string;
  lgaId: string | null;
}) {
  const session = await requireCapability("public-alerts:write");
  const { lgaId, ...copy } = input;
  const fields = editSchema.parse(copy);
  const jurisdiction = lgaId ?? session.jurisdictionIds[0];
  if (!jurisdiction || !session.jurisdictionIds.includes(jurisdiction))
    throw new Error("Area outside your approved jurisdiction.");
  await connectDB();
  const doc = await PublicAlert.create({
    ...fields,
    jurisdiction,
    status: "draft",
    createdBy: session.userId,
    simulation: false,
  });
  return { id: String(doc._id) };
}
