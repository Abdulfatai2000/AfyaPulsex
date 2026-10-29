import "server-only";
import { connectDB } from "@/server/db/connection";
import { User } from "@/server/models/User";

/** Database authority: never infer environment from cookies, emails or request flags. */
export async function accountIsDemo(userId: string) {
  await connectDB();
  const account = await User.findById(userId).select("isDemo").lean();
  if (!account) throw new Error("Account unavailable.");
  return account.isDemo === true;
}

export async function accountRecordFilter(userId: string) {
  return { simulation: await accountIsDemo(userId) ? true : { $ne: true } };
}
