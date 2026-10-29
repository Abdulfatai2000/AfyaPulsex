import { PulseLoader } from "../feedback/CitizenLoading";
import { Skeleton } from "@/components/ui/skeleton";
export function AlertSkeleton({ detail = false }: { detail?: boolean }) {
  if (detail) {
    return (
      <div
        className="al-skeleton-detail motion-reduce:[&_*]:animate-none"
        aria-busy="true"
        aria-label="Loading alert details"
      >
        <div className="skel-icon-row">
          <Skeleton className="skel-icon" />
          <Skeleton className="skel-line medium" />
        </div>
        <Skeleton className="skel-line wide" />
        <Skeleton className="skel-line medium" />
        <Skeleton className="skel-block" />
        <Skeleton className="skel-line wide" />
        <Skeleton className="skel-line medium" />
        <div className="skel-icon-row">
          <Skeleton className="skel-icon" />
          <Skeleton className="skel-line medium" />
        </div>
        <Skeleton className="skel-block" />
      </div>
    );
  }
  return (
    <div
      className="al-skeleton-list motion-reduce:[&_*]:animate-none"
      aria-busy="true"
      aria-label="Loading alerts"
    >
      <PulseLoader message="Loading alerts..." />
      {[0, 1, 2].map((i) => (
        <div key={i} className="al-skeleton-row">
          <Skeleton className="skel-icon" />
          <div className="skel-lines">
            <Skeleton className="skel-line" />
            <Skeleton className="skel-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}
