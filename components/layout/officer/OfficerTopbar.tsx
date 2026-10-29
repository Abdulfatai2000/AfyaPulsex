"use client";

import { usePathname } from "next/navigation";
import { cn } from "cn";
import { getNavigationPageContext } from "./navigation";
import { OfficerAccountArea } from "./OfficerAccountArea";
import { AppLogo } from "@/components/shared/AppLogo";

export function OfficerTopbar({ brandNarrow = false }: { brandNarrow?: boolean }) {
  const pathname = usePathname();

  // Current page context so the header always communicates where you are.
  // TODO(DEV4): title/subtitle from the authorized session when available.
  const pageContext = getNavigationPageContext(pathname ?? "");

  // Single full-width desktop header: the ONLY element carrying the header
  // background image on lg+, so the image renders once, continuously, across
  // the entire header width. The brand zone matches the sidebar width
  // (w-64 / w-16) so the page title always begins in the main content area,
  // after the sidebar boundary — the same shared alignment on every page.
  return (
    <header className="officer-header-bg sticky top-0 z-30 hidden h-[76px] w-full shrink-0 items-center border-b border-blue-900/50 lg:flex">
      <div
        className={cn(
          "flex min-w-0 shrink-0 items-center px-4",
          brandNarrow ? "w-16 justify-center" : "w-64 justify-start",
        )}
      >
        <AppLogo showText={!brandNarrow} textClassName="text-white" />
      </div>
      <div className="min-w-0 flex-1 px-4 sm:px-6">
        <p className="truncate text-sm font-semibold text-white">
          {pageContext}
        </p>
        <p className="truncate text-xs text-blue-200">Officer Portal</p>
      </div>
      <div className="min-w-0 shrink-0 pr-4 sm:pr-6">
        <OfficerAccountArea />
      </div>
    </header>
  );
}
