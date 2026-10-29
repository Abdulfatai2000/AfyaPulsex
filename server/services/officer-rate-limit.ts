import "server-only";
import { createHash } from "node:crypto";
import { Schema, model, models } from "mongoose";
import { connectDB } from "@/server/db/connection";

const schema = new Schema({ _id: String, count: { type: Number, default: 0 }, expiresAt: Date });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Limit = models.OfficerRateLimit || model("OfficerRateLimit", schema);
/** Shared across instances; no raw names/emails/IPs stored. Fixed windows fail closed. */
export async function officerRateLimit(key: string, max: number, seconds = 3600) {
  await connectDB();
  const window = Math.floor(Date.now() / (seconds * 1000));
  const id = createHash("sha256").update(`${key}:${window}`).digest("hex");
  let row;
  try {
    row = await Limit.findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * seconds * 1000) } }, { upsert: true, returnDocument: "after" }).lean();
  } catch { return false; }
  return !!row && Number(row.count) <= max;
}
