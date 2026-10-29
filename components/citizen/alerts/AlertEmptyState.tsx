import { Inbox } from "lucide-react";
export function AlertEmptyState() {
  return (
    <div className="al-empty">
      <Inbox size={36} aria-hidden="true" />
      <h2>No public health alerts right now</h2>
      <p>New public health notices will appear here when they are published.</p>
    </div>
  );
}
