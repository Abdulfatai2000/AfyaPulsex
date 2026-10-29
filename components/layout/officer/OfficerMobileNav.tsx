"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Map,
  AlertTriangle,
  FileText,
  MoreHorizontal,
  LayoutDashboard,
  Search,
  FileSearch,
  BarChart3,
  Activity,
  Megaphone,
  Bell,
  CheckSquare,
  FlaskConical,
  UserCog,
} from "lucide-react";
import { cn } from "cn";
import {
  officerNavigation,
  officerMobileNavigation,
  officerProfileNavigation,
} from "./navigation";

const mobileIconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  Home: Home,
  Map: Map,
  Alerts: AlertTriangle,
  Reports: FileText,
  Overview: LayoutDashboard,
  "Signal Map": Map,
  "Early Warnings": AlertTriangle,
  "Signal Explorer": Search,
  Investigations: FileSearch,
  Analytics: BarChart3,
  Response: Activity,
  "Public Alerts": Megaphone,
  Notifications: Bell,
  Approvals: CheckSquare,
  Simulation: FlaskConical,
  "Profile & Settings": UserCog,
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function OfficerMobileNav() {
  const pathname = usePathname();

  const overflowItems = [
    ...officerNavigation.filter(
      (item) =>
        !officerMobileNavigation.some((mobile) => mobile.href === item.href),
    ),
    officerProfileNavigation,
  ];

  const isOverflowActive = overflowItems.some((item) =>
    isActivePath(pathname, item.href),
  );

  return (
    <nav
      aria-label="Officer mobile navigation"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {officerMobileNavigation.map((item) => {
        const Icon = mobileIconMap[item.label];
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
              active
                ? "text-primary-blue"
                : "text-muted-foreground hover:text-primary-blue",
            )}
          >
            {Icon && <Icon className="h-5 w-5" />}
            {item.label}
          </Link>
        );
      })}
      <details className="group">
        <summary
          aria-current={isOverflowActive ? "page" : undefined}
          className={cn(
            "flex min-h-14 cursor-pointer list-none items-center justify-center gap-1 text-xs",
            isOverflowActive
              ? "text-primary-blue"
              : "text-muted-foreground hover:text-primary-blue",
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </summary>
        <ul className="absolute inset-x-2 bottom-full mb-2 max-h-[60dvh] overflow-y-auto rounded-xl border bg-white p-3 shadow-sm">
          {overflowItems.map((item) => {
            const Icon = mobileIconMap[item.label];
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 text-sm",
                    active
                      ? "bg-primary-blue text-white"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {Icon && <Icon className="h-5 w-5 shrink-0" />}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </details>
    </nav>
  );
}
