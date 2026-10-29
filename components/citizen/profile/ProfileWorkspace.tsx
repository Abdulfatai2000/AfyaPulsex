"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  HeartPulse,
  LifeBuoy,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { ProfileSettingsData } from "@/server/actions/citizen/profile";
import { LocationSection } from "./LocationSection";
import { ProfileSection } from "./ProfileSection";
import { HealthProfileSection } from "./HealthProfileSection";
import { PrivacyConsentSection } from "./PrivacyConsentSection";
import { SecuritySection } from "./SecuritySection";
import { NotificationPreferences } from "./NotificationPreferences";
import { PreferencesSection } from "./PreferencesSection";
import { HelpSupportSection } from "./HelpSupportSection";

export type ProfileSectionId =
  | "profile"
  | "health-profile"
  | "privacy-consent"
  | "security"
  | "notifications"
  | "preferences"
  | "help-support";

interface ProfileSectionConfig {
  id: ProfileSectionId;
  label: string;
  description: string;
  Icon: LucideIcon;
  component?: () => ReturnType<typeof ProfileSection>;
}

const sections: ProfileSectionConfig[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Your name, date of birth, and other basic details.",
    Icon: UserRound,
  },
  {
    id: "health-profile",
    label: "Health profile",
    description:
      "Optional details like blood group, allergies, and medications.",
    Icon: HeartPulse,
  },
  {
    id: "privacy-consent",
    label: "Privacy & Consent",
    description: "Your personal tracking and community contribution choices.",
    Icon: ShieldCheck,
  },
  {
    id: "security",
    label: "Security",
    description: "Password, sessions, and account security settings.",
    Icon: LockKeyhole,
    component: SecuritySection,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Choose how AfyaPulse notifies you about health alerts.",
    Icon: Bell,
    component: NotificationPreferences,
  },
  {
    id: "preferences",
    label: "Preferences",
    description: "Units, language, and accessibility preferences.",
    Icon: SlidersHorizontal,
    component: PreferencesSection,
  },
  {
    id: "help-support",
    label: "Help & Support",
    description: "FAQs, support, privacy, and terms information.",
    Icon: LifeBuoy,
    component: HelpSupportSection,
  },
];

export function ProfileWorkspace({
  accountEmailMasked,
  initial,
}: {
  accountEmailMasked?: string | null;
  initial: ProfileSettingsData;
}) {
  const [selected, setSelected] = useState<ProfileSectionId | null>(null);

  // Desktop defaults to the first section; mobile starts on the settings menu.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 992px)");
    const update = () =>
      setSelected((prev) => (mq.matches && prev === null ? "profile" : prev));
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const active = selected ?? "profile";

  return (
    <div className="pf-workspace">
      <header className="pf-header">
        <p className="pf-eyebrow">ACCOUNT &amp; PREFERENCES</p>
        <h1 className="pf-title">Profile &amp; settings</h1>
        <p>
          Manage your personal details, health profile, privacy choices, and how
          AfyaPulse works for you.
        </p>
      </header>

      <div className="pf-layout">
        <nav aria-label="Settings sections" className="pf-nav">
          {sections.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className="pf-nav-button"
              aria-current={active === id ? "true" : undefined}
              onClick={() => setSelected(id)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {selected === null ? (
          <div className="pf-menu">
            {sections.map(({ id, label, description, Icon }) => (
              <button
                key={id}
                type="button"
                className="pf-menu-item"
                onClick={() => setSelected(id)}
              >
                <span className="pf-menu-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="pf-menu-body">
                  <strong>{label}</strong>
                  <span>{description}</span>
                </span>
                <ChevronRight aria-hidden="true" className="pf-menu-chevron" />
              </button>
            ))}
          </div>
        ) : (
          <div className="pf-panel">
            <button
              type="button"
              className="pf-mobile-back"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft aria-hidden="true" />
              Back to settings
            </button>
            {sections.map(
              ({ id, label, description, component: Component }) => (
                <section
                  key={id}
                  className="pf-panel-section"
                  aria-labelledby={`${id}-title`}
                  hidden={selected !== id}
                >
                  <header className="pf-section-head">
                    <h2 id={`${id}-title`} tabIndex={-1}>
                      {label}
                    </h2>
                    <p>{description}</p>
                  </header>
                  {id === "security" ? (
                    <SecuritySection accountEmailMasked={accountEmailMasked} />
                  ) : id === "profile" ? (
                    <>
                      <ProfileSection initial={initial.profile} />
                      <LocationSection initial={initial.profile.address} />
                    </>
                  ) : id === "health-profile" ? (
                    <HealthProfileSection initial={initial.health} />
                  ) : id === "privacy-consent" ? (
                    <PrivacyConsentSection initial={initial.consent} />
                  ) : Component ? (
                    <Component />
                  ) : null}
                </section>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
