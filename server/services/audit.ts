// Dev 4 owns this service (security). Immutable audit trail writes.
// Stub — replace throws with real logic backed by /server/db + AuditLog model.
import type { AuditLog } from "@/server/models";

export async function writeAuditLog(
  input: Partial<AuditLog>,
): Promise<AuditLog> {
  throw new Error("Not implemented — Dev 4");
}

export async function queryAuditLog(opts: {
  actorId?: string;
  resourceType?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}): Promise<AuditLog[]> {
  throw new Error("Not implemented — Dev 4");
}
