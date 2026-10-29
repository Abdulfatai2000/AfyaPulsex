import { Activity, Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./citizen-loading.module.css";

export function PulseLoader({
  message = "Preparing your health information...",
}: {
  message?: string;
}) {
  return (
    <div className={styles.loader} role="status" aria-live="polite">
      <div className={styles.track} aria-hidden="true">
        <Activity className={styles.mark} strokeWidth={2.5} />
      </div>
      <span>{message}</span>
    </div>
  );
}

export function CitizenContentSkeleton({
  layout = "rows",
}: {
  layout?: "cards" | "rows" | "chart";
}) {
  return (
    <div aria-hidden="true" className={`${styles.skeletons} ${styles[layout]}`}>
      {Array.from({ length: layout === "chart" ? 1 : 3 }, (_, index) => (
        <div key={index} className={styles.placeholder}>
          <Skeleton className="h-4 w-1/3 motion-reduce:animate-none" />
          <Skeleton
            className={`${layout === "chart" ? "h-44" : "h-8"} w-full motion-reduce:animate-none`}
          />
          <Skeleton className="h-3 w-2/3 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export function CitizenLoading({
  message,
  layout = "rows",
}: {
  message?: string;
  layout?: "cards" | "rows" | "chart";
}) {
  return (
    <section className={styles.section} aria-busy="true">
      <PulseLoader message={message} />
      <CitizenContentSkeleton layout={layout} />
    </section>
  );
}

export function PendingButton({
  pending,
  pendingLabel,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  return (
    <button {...props} disabled={disabled || pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2
            aria-hidden="true"
            size={18}
            className="animate-spin motion-reduce:animate-none"
          />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
