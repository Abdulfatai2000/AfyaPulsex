import {
  House,
  Plus,
  HeartPulse,
  ClipboardList,
  Bell,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { NavigationItem } from "@/types/frontend";
type CitizenNavigationItem = NavigationItem & { icon: LucideIcon };
export const citizenNavigation = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/report", label: "Report", icon: Plus },
  { href: "/vitals", label: "Vitals", icon: HeartPulse },
  { href: "/my-health", label: "My Health", icon: ClipboardList },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const satisfies readonly CitizenNavigationItem[];
const mobileOrder = [
  "/dashboard",
  "/my-health",
  "/report",
  "/alerts",
  "/profile",
];
export const citizenMobileNavigation = mobileOrder.map((href) =>
  citizenNavigation.find((item) => item.href === href)!,
);
export function isCitizenRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
