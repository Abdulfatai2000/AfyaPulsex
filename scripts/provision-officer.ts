import { emitKeypressEvents } from "node:readline";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { config } from "dotenv";
import { z } from "zod";
import { prompt } from "./provision-admin";
import { connectDB, closeDB } from "../server/db/connection";
import { User, OfficerProfile, Jurisdiction } from "../server/models";
import hashPassword from "../server/lib/hashpassword";
import { emailSchema, fullNameSchema, passwordSchema, positionSchema, governmentLevelSchema } from "../lib/validation/validators";
import { referenceLocation, resolveJurisdiction } from "../server/services/jurisdiction-resolution";
import { OFFICER_PORTAL_CAPABILITIES } from "../server/auth/officer-capabilities";

const inputSchema = z.object({ name: fullNameSchema, email: emailSchema, password: passwordSchema,
  title: positionSchema, organization: z.string().trim().min(2).max(300), level: governmentLevelSchema,
  // state is required for state-level provisioning but must be left blank for federal
  state: z.string(), lga: z.string(), approvalScope: z.enum(["state", "federal"]),
}).superRefine((val, ctx) => {
  if (val.level !== "federal" && val.state.trim().length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["state"], message: "State is required for non-federal provisioning." });
  }
});
export async function provisionOfficer(input: z.input<typeof inputSchema>) {
  const data = inputSchema.parse(input);
  if (Buffer.byteLength(data.password, "utf8") > 72) throw new Error("Password exceeds 72 UTF-8 bytes.");
  if (data.level === "local" || data.approvalScope !== data.level) throw new Error("Bootstrap approvers must have matching State or Federal authority and scope.");
  await connectDB(); await User.init();
  if (await User.exists({ email: data.email })) throw new Error("Email already exists. No credentials or account roles were changed.");
  let root: { _id: unknown; name: string } | null;
  if (data.level === "federal") {
    // Federal approvers are anchored to the country-level jurisdiction (NG).
    // referenceLocation / resolveJurisdiction are state-aware and must not be
    // called when state is intentionally blank.
    root = await Jurisdiction.findOneAndUpdate(
      { code: "NG", level: "country" },
      { $setOnInsert: { name: "Nigeria", level: "country", centroid: null } },
      { upsert: true, new: true },
    ).lean();
  } else {
    referenceLocation(data.state, data.lga || undefined);
    const area = await resolveJurisdiction(data.state, undefined, true);
    root = area?.state ?? null;
  }
  if (!root) throw new Error("Jurisdiction unavailable.");
  // const alias preserves the non-null narrowing inside the async transaction closure
  // (TypeScript does not propagate let-binding narrowing across closure boundaries).
  const resolvedRoot = root;
  const passwordHash = await hashPassword(data.password);
  await User.db.transaction(async session => {
    const [user] = await User.create([{ name: data.name, email: data.email, passwordHash, role: "officer", accountStatus: "active", simulation: false }], { session });
    await OfficerProfile.create([{ user: user._id, title: data.title, organizationName: data.organization,
      governmentLevel: data.level, jurisdiction: resolvedRoot._id as any, status: "approved", approvedAt: new Date(),
      setupRequired: true, setupCompletedAt: new Date(),
      capabilities: [...OFFICER_PORTAL_CAPABILITIES, "access:approve"],
      approvalAuthority: { canApproveOfficerAccess: true, approvalScope: data.approvalScope }, simulation: false,
    }], { session });
  });
  return { scope: data.approvalScope, jurisdiction: resolvedRoot.name };
}
async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run provision:officer in an interactive terminal. Piped credentials are not accepted.");
  config({ path: resolve(process.cwd(), ".env.local"), quiet: true }); emitKeypressEvents(process.stdin);
  let password = "";
  try {
    const name = await prompt("Full Name: "); const email = await prompt("Official Email: ");
    password = await prompt("Password (hidden): ", true);
    if (password !== await prompt("Confirm password (hidden): ", true)) throw new Error("Passwords do not match.");
    const title = await prompt("Official Designation: ");
    const organization = await prompt("Organisation / Surveillance Authority: ");
    const level = governmentLevelSchema.parse(await prompt("Government level (state/federal; bootstrap approvers): "));
    const state = await prompt("State (name or existing reference slug): ");
    const lga = await prompt("LGA (optional reference; leave blank for State/national scope): ");
    const approvalScope = z.enum(["state", "federal"]).parse(await prompt("Explicit approval scope (state/federal): "));
    console.log("This grants access:approve within the chosen State or national jurisdiction. No out-of-scope bypass is created.");
    if (await prompt("Type PROVISION to create this trusted Officer: ") !== "PROVISION") throw new Error("Cancelled.");
    const result = await provisionOfficer({ name, email, password, title, organization, level, state, lga, approvalScope });
    password = "";
    console.log(`Officer created: ACTIVE, APPROVED, setup completed. Approval scope: ${result.scope}; jurisdiction: ${result.jurisdiction}.`);
    console.log("Use normal Officer Login at /auth?entry=officer, then /officer/approvals. No separate master login exists.");
  } finally { password = ""; await closeDB(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch((err: unknown) => {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`Officer provisioning failed or was cancelled: ${reason}`);
    console.error("Check the inputs, duplicate email and database availability. No existing account was overwritten.");
    process.exitCode = 1;
  });
}
