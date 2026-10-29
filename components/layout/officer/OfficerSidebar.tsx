"use client";

import { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  Search,
  FileSearch,
  BarChart3,
  Activity,
  Megaphone,
  FileText,
  Bell,
  CheckSquare,
  FlaskConical,
  UserCog,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signOutOfficer } from "@/lib/services/officer/profile";
import {
  officerNavigation,
  officerProfileNavigation,
} from "./navigation";

const sidebarIconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  Overview: LayoutDashboard,
  "Signal Map": Map,
  "Early Warnings": AlertTriangle,
  "Signal Explorer": Search,
  Investigations: FileSearch,
  Analytics: BarChart3,
  Response: Activity,
  "Public Alerts": Megaphone,
  Reports: FileText,
  Notifications: Bell,
  Approvals: CheckSquare,
  Simulation: FlaskConical,
  "Profile & Settings": UserCog,
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function OfficerSidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleSignOut = () => {
    void signOutOfficer();
    setLogoutOpen(false);
  };

  const Icon = sidebarIconMap[officerProfileNavigation.label];
  const profileActive = isActivePath(pathname, officerProfileNavigation.href);

  return (
    <aside
      className={cn(
        // Nav-only column filling the locked shell row beneath the fixed
        // header: it never moves while the main column scrolls. The nav
        // list scrolls internally only on short viewports while profile
        // actions stay pinned.
        // relative + overflow-visible so the collapse button at the right
        // edge is never clipped by the scrolling nav.
        "relative hidden flex-col overflow-visible bg-deep-navy text-white lg:flex lg:h-full lg:shrink-0",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <nav
        aria-label="Officer navigation"
        className="officer-no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4"
      >
        <ul className="space-y-1">
          {officerNavigation.map((item) => {
            const NavIcon = sidebarIconMap[item.label];
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                    collapsed && "justify-center",
                    active
                      ? "bg-primary-blue text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {NavIcon && <NavIcon className="h-5 w-5 shrink-0" />}
                  <span className={cn(collapsed && "sr-only")}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Collapse toggle sits at the sidebar's right edge, outside the
          scrolling nav so no overflow container can clip it. */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-deep-navy text-white shadow-md outline-none transition-colors hover:bg-primary-blue focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5" aria-hidden="true" />
        ) : (
          <ChevronLeft className="size-3.5" aria-hidden="true" />
        )}
      </button>
      <div className="flex shrink-0 flex-col border-t border-white/20 px-3 py-4">
        <ul className="space-y-1">
          <li>
            <Link
              href={officerProfileNavigation.href}
              aria-current={profileActive ? "page" : undefined}
              title={collapsed ? officerProfileNavigation.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                collapsed && "justify-center",
                profileActive
                  ? "bg-primary-blue text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              {Icon && <Icon className="h-5 w-5 shrink-0" />}
              <span className={cn(collapsed && "sr-only")}>
                {officerProfileNavigation.label}
              </span>
            </Link>
          </li>
          <li>
            <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <DialogTrigger
                render={
                  <button
                    type="button"
                    aria-label={collapsed ? "Log Out" : undefined}
                    title={collapsed ? "Log Out" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm",
                      collapsed && "justify-center",
                      "text-danger-red hover:bg-danger-red/15",
                    )}
                  >
                    <LogOut
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className={cn(collapsed && "sr-only")}>Log Out</span>
                  </button>
                }
              />
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Sign out of AfyaPulse?</DialogTitle>
                  <DialogDescription>
                    You will be returned to the sign-in screen. Any unfinished
                    work will be discarded.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLogoutOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </li>
        </ul>
      </div>
    </aside>
  );
}