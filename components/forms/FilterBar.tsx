import type { ReactNode } from "react";
export function FilterBar({ children }: { children?: ReactNode }) {
  return (
    <div
      role="group"
      aria-label="Filters"
      className="flex min-w-0 flex-wrap gap-3"
    >
      {children}
    </div>
  );
}
