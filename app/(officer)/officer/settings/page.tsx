import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileSettingsCenterClient } from "@/components/officer/profile/ProfileSettingsCenterClient";

function ProfileFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
      <div className="flex min-w-0 gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 flex-none rounded-lg bg-gray-100" />
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-gray-100" />
          <div className="space-y-2">
            <div className="h-5 w-48 rounded bg-gray-100" />
            <div className="h-3 w-32 rounded bg-gray-100" />
            <div className="h-3 w-40 rounded bg-gray-100" />
          </div>
        </div>
        <div className="space-y-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 w-full rounded bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Profile & Settings"
        description="Manage your officer account — profile details, security, notification preferences, application preferences, and the access you are authorized for. Authorization remains controlled by the backend."
      />
      <Suspense fallback={<ProfileFallback />}>
        <ProfileSettingsCenterClient />
      </Suspense>
    </section>
  );
}