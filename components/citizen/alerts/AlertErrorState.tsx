import { AlertCircle } from "lucide-react";
export function AlertErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="al-error" role="alert">
      <AlertCircle size={36} aria-hidden="true" />
      <h2>We couldn&apos;t load health alerts.</h2>
      <p>Please check your connection and try again.</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
