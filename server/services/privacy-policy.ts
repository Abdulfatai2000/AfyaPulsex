import "server-only";

export const COMMUNITY_PURPOSE = "communityContribution";
export const INSUFFICIENT_AGGREGATED_DATA = "INSUFFICIENT_AGGREGATED_DATA";

/** No approved defaults: missing configuration must close disclosure. */
export function communityPolicyVersion() {
  return process.env.COMMUNITY_CONSENT_VERSION?.trim() || null;
}
export function minimumAggregateGroup() {
  const raw = process.env.MIN_AGGREGATE_GROUP_SIZE?.trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 2 ? value : null;
}
