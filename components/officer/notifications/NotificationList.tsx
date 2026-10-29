import type { OfficerNotification } from "@/lib/services/officer/notifications";
import { NotificationItem } from "./NotificationItem";

interface Props {
  items: OfficerNotification[];
  onAction: (notification: OfficerNotification) => void;
}

/**
 * Notification feed for the Notifications / Alerts Center. Pure presentational
 * list — the client owns loading, empty/error/state handling and the
 * mark-as-read navigation flow.
 */
export function NotificationList({ items, onAction }: Props) {
  return (
    <ul
      role="list"
      aria-label="Notifications"
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm"
    >
      {items.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onAction={onAction}
        />
      ))}
    </ul>
  );
}