"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { AppLogo } from "@/components/shared/AppLogo";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { OfficerSidebar } from "./OfficerSidebar";
import { OfficerMobileNav } from "./OfficerMobileNav";
import { OfficerTopbar } from "./OfficerTopbar";
import { OfficerAccountArea } from "./OfficerAccountArea";
import { DataModeBanner } from "@/components/officer/data-mode/DataModeBanner";

/**
 * Shared Officer Portal chrome (desktop header + sidebar + content column).
 * Owns the sidebar collapsed state so the header brand zone and the sidebar
 * stay the same width: the page title always begins after the sidebar
 * boundary on every page.
 *
 * Desktop (lg+) scroll architecture — viewport-locked shell:
 *   HEADER (fixed region, never scrolls)
 *   SIDEBAR | MAIN CONTENT (only this column scrolls vertically)
 * A single lg:overflow-y-auto scroller; the page/body never scrolls, so
 * there is exactly one vertical scrollbar and no nested overflow.
 */
export function OfficerPortalLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <OfficerTopbar brandNarrow={collapsed} />
      <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-1">
        <OfficerSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
        {/* The single main scroller. `relative` makes it the containing
            block for any absolutely-positioned page content (e.g. sr-only
            spans/tables), so such boxes can never escape into the document
            scrollable overflow and create a second body scrollbar. */}
        <div className="relative flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
          <header className="officer-header-bg sticky top-0 z-10 border-b border-blue-900/50 px-4 py-2.5 lg:hidden">
            {/* Wordmark hides below 420px so the Data Mode switch, bell and
                profile menu fit without page-level horizontal scrolling. */}
            <div className="flex min-w-0 items-center justify-between gap-2">
              <AppLogo textClassName="hidden min-[420px]:inline text-white" />
              <OfficerAccountArea compact />
            </div>
          </header>
          <DataModeBanner />
          <main className="min-w-0">
            <ResponsiveContainer>{children}</ResponsiveContainer>
          </main>
        </div>
      </div>
      <OfficerMobileNav />
    </>
  );
}
