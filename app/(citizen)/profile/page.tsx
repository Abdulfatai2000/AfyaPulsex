import { requireCitizen } from "@/server/auth/rbac";
import type { Metadata } from "next";
import { ProfileWorkspace } from "@/components/citizen/profile/ProfileWorkspace";
import "./profile.css";
import { getProfileSettingsAction } from "@/server/actions/citizen/profile";

export const metadata: Metadata = {
  title: "Profile & Settings | AfyaPulse",
};

export default async function ProfilePage() {
  await requireCitizen();
  const initial = await getProfileSettingsAction();
  const email = initial.profile.email;
  const separator = email?.lastIndexOf("@") ?? -1;
  const accountEmailMasked =
    email && separator > 0
      ? `${email.slice(0, Math.min(2, Math.max(1, separator - 1)))}*****${email.slice(separator)}`
      : null;
  return (
    <ProfileWorkspace
      initial={initial}
      accountEmailMasked={accountEmailMasked}
    />
  );
}
