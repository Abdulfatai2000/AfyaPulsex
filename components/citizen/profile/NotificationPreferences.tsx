"use client";
import { useState } from "react";
import { SettingsCard, SettingsRow, Switch } from "./profile-ui";

interface ChannelState {
  in_app: boolean;
  email: boolean;
}

export function NotificationPreferences() {
  const [channels, setChannels] = useState<ChannelState>({
    in_app: true,
    email: false,
  });
  const [changed, setChanged] = useState(false);

  // TODO(DEV3): persist notification preferences through the agreed boundary.
  // Only In-app and Email channels exist; SMS/push require separate
  // infrastructure and are deliberately not offered here.

  function toggle(channel: keyof ChannelState, next: boolean) {
    setChannels((prev) => ({ ...prev, [channel]: next }));
    setChanged(true);
  }

  return (
    <>
      <SettingsCard
        title="Notifications"
        description="Choose how AfyaPulse tells you about events that matter."
      >
        <SettingsRow
          title="Health Alerts"
          description="Public health alerts and notices relevant to your area. In-app appears inside AfyaPulse; Email uses your sign-in address."
          control={
            <div className="pf-channel-controls">
              <div className="pf-channel">
                <span>In-app</span>
                <Switch
                  checked={channels.in_app}
                  onChange={(next) => toggle("in_app", next)}
                  label="In-app notifications for health alerts"
                />
              </div>
              <div className="pf-channel">
                <span>Email</span>
                <Switch
                  checked={channels.email}
                  onChange={(next) => toggle("email", next)}
                  label="Email notifications for health alerts"
                />
              </div>
            </div>
          }
        />
        {changed ? (
          <div className="pf-status pf-status-success" role="status">
            <span>
              Your selections apply to this page only; notification delivery
              has not changed.
            </span>
          </div>
        ) : null}
      </SettingsCard>
    </>
  );
}
