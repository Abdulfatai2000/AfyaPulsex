import "server-only";
import { requireApprovedOfficer } from "@/server/auth/rbac";
import type { OfficerDataMode } from "./data-mode";

/** Cookies, URL flags and client storage cannot choose a data environment. */
export async function getServerDataMode(): Promise<OfficerDataMode> {
  const session = await requireApprovedOfficer();
  return session.user.isDemo === true ? "demo" : "live";
}
