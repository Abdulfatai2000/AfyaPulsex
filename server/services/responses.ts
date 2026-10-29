// Dev 3 owns this service. Response actions and coordination.
import "server-only";
import { connectDB } from "@/server/db/connection";
import { ResponseAction } from "@/server/models";
import { omitMeta } from "@/server/lib/model-utils";

export async function createResponseAction(
  input: Partial<ResponseAction>,
): Promise<ResponseAction> {
  await connectDB();
  const { status, ...rest } = omitMeta(input);
  const doc = await ResponseAction.create({
    ...rest,
    status: status ?? "planned",
  });
  return doc.toObject();
}

export async function updateResponseStatus(
  actionId: string,
  status: ResponseAction["status"],
): Promise<ResponseAction> {
  await connectDB();
  if (!status) throw new Error("status is required");
  const doc = await ResponseAction.findByIdAndUpdate(
    actionId,
    {
      $set: {
        status,
        ...(status === "completed" ? { completedAt: new Date() } : {}),
      },
    },
    { new: true, runValidators: true },
  ).lean();
  if (!doc) throw new Error("Response action not found");
  return doc;
}
