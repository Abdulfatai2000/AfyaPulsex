"use server";
import { requireCitizen } from "@/server/auth/rbac";
import { getCitizenProfile } from "@/server/services/citizen-profile";
import { publishedCitizenFeed } from "@/server/services/public-alerts";
import { jurisdictionAncestors } from "@/server/services/jurisdiction-resolution";
import type { CitizenAlertFeed } from "@/types/public-alerts";

export async function getAlertsAction(): Promise<CitizenAlertFeed> {
  const session = await requireCitizen();
  const profile = await getCitizenProfile(session.userId);
  const scope = await jurisdictionAncestors(profile?.jurisdiction?.toString());
  return {
    records: await publishedCitizenFeed(scope, session.user.isDemo === true),
    asOf: new Date().toISOString(),
  };
}
