import type { ReactNode } from "react";
export function ResponsiveContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6">
      {children}
    </div>
  );
}
