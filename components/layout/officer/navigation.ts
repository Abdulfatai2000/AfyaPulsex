import type { NavigationItem } from "@/types/frontend";
// TODO(DEV4): filter permission-dependent entries, especially Approvals, using
// server-approved capabilities. This UI list does not grant access.
export const officerNavigation: readonly NavigationItem[] = [
  { href: "/officer/overview", label: "Overview" },
  { href: "/officer/map", label: "Signal Map" },
  { href: "/officer/warnings", label: "Early Warnings" },
  { href: "/officer/explorer", label: "Signal Explorer" },
  { href: "/officer/investigations", label: "Investigations" },
  { href: "/officer/analytics", label: "Analytics" },
  { href: "/officer/response", label: "Response" },
  { href: "/officer/public-alerts", label: "Public Alerts" },
  { href: "/officer/reports", label: "Reports" },
  { href: "/officer/notifications", label: "Notifications" },
  { href: "/officer/approvals", label: "Approvals" },
];
export const officerProfileNavigation: NavigationItem = {
  href: "/officer/profile",
  label: "Profile & Settings",
};
export const officerMobileNavigation: readonly NavigationItem[] = [
  { href: "/officer/overview", label: "Home" },
  { href: "/officer/map", label: "Map" },
  { href: "/officer/warnings", label: "Alerts" },
  { href: "/officer/reports", label: "Reports" },
];

const ALL_NAV_ITEMS: readonly NavigationItem[] = [
  ...officerNavigation,
  officerProfileNavigation,
  ...officerMobileNavigation,
];

/**
 * Resolve the current page context label from the active route, used by the
 * topbar so the header always communicates "where you are". Falls back to a
 * readable form of the URL when a route has no nav entry (e.g. /officer/settings).
 */
export function getNavigationPageContext(pathname: string): string {
  const exact = ALL_NAV_ITEMS.find((item) => pathname === item.href);
  if (exact) {
    return exact.label;
  }
  const prefixes = ALL_NAV_ITEMS.filter((item) =>
    pathname.startsWith(item.href + "/"),
  );
  if (prefixes.length > 0) {
    return [...prefixes].sort((a, b) => b.href.length - a.href.length)[0].label;
  }
  const segment = pathname.split("/").filter(Boolean).pop();
  if (segment) {
    return segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Officer Portal";
}
