// Dev 3 owns this service. Investigation workflows.
// An investigation follows an EarlyWarning; officers open it under their scope.
import "server-only";
import { connectDB } from "@/server/db/connection";
import { Investigation } from "@/server/models";
import type { QueryFilter } from "mongoose";
import { omitMeta } from "@/server/lib/model-utils";

export async function openInvestigation(
  input: Partial<Investigation>,
): Promise<Investigation> {
  await connectDB();
  const { status, ...rest } = omitMeta(input);
  const doc = await Investigation.create({
    ...rest,
    status: status ?? "open",
    openedAt: new Date(),
  });
  return doc.toObject();
}

export async function listInvestigations(
  jurisdictionId?: string | string[],
): Promise<Investigation[]> {
  await connectDB();
  const query: QueryFilter<Investigation> = { simulation: { $ne: true } };
  if (jurisdictionId) {
    if (Array.isArray(jurisdictionId)) {
      query.jurisdiction = { $in: jurisdictionId };
    } else {
      query.jurisdiction = jurisdictionId;
    }
  }
  return Investigation.find(query).sort({ openedAt: -1 }).lean();
}

export async function getInvestigationById(
  id: string,
): Promise<Investigation | null> {
  await connectDB();
  return Investigation.findOne({ _id: id, simulation: { $ne: true } }).lean();
}

export async function updateInvestigation(
  id: string,
  patch: Partial<Investigation>,
): Promise<Investigation | null> {
  await connectDB();
  return Investigation.findOneAndUpdate(
    { _id: id, simulation: { $ne: true } },
    { $set: omitMeta(patch) },
    { new: true, runValidators: true },
  ).lean();
}

export async function addInvestigationNote(
  id: string,
  authorId: string,
  authorName: string,
  body: string,
): Promise<Investigation | null> {
  await connectDB();
  return Investigation.findOneAndUpdate(
    { _id: id, simulation: { $ne: true } },
    {
      $push: {
        notes: {
          author: authorId,
          authorName,
          body,
          createdAt: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  ).lean();
}
