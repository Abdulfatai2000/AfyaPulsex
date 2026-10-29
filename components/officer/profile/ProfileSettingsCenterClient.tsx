"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProfileTabs, PROFILE_TABS, type ProfileTabValue } from "./ProfileTabs";
import { OfficerProfileSection } from "./OfficerProfileSection";
import { OfficerSecuritySection } from "./OfficerSecuritySection";
import { OfficerNotificationSettings } from "./OfficerNotificationSettings";
import { OfficerPreferences } from "./OfficerPreferences";
import { DataAccessSection } from "./DataAccessSection";

const VALID_TABS: ReadonlyArray<ProfileTabValue> = PROFILE_TABS.map(
  (tab) => tab.value,
);

function mapTabParam(value: string | null): ProfileTabValue {
  return VALID_TABS.includes(value as ProfileTabValue)
    ? (value as ProfileTabValue)
    : "profile";
}

/**
 * Profile & Settings center — Profile is the default active tab. Each tab
 * renders its own section; all of them read and write exclusively through the
 * profile service boundary.
 */
export function ProfileSettingsCenterClient() {
  const searchParams = useSearchParams();
  const requestedTab = mapTabParam(searchParams.get("tab"));
  const [tab, setTab] = useState<ProfileTabValue>(requestedTab);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ProfileTabs value={tab} onChange={setTab} />

      {tab === "profile" ? (
        <OfficerProfileSection />
      ) : tab === "security" ? (
        <OfficerSecuritySection />
      ) : tab === "notifications" ? (
        <OfficerNotificationSettings />
      ) : tab === "preferences" ? (
        <OfficerPreferences />
      ) : (
        <DataAccessSection />
      )}
    </div>
  );
}