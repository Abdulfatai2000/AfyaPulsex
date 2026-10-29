import type { ReactNode } from "react";
import type { PageStateKind } from "@/types/frontend";
export interface PageStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}
export function PageState({
  kind,
  title,
  description,
  action,
}: PageStateProps & { kind: PageStateKind }) {
  return (
    <section
      data-state={kind}
      role={kind === "error" ? "alert" : "status"}
      aria-busy={kind === "loading"}
      className="min-w-0 rounded-xl border bg-card p-6"
    >
      <h2 className="font-semibold">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
