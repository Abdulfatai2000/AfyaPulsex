"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { citizenNavigation, isCitizenRouteActive } from "./navigation";
export function CitizenDesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Citizen navigation" className="ap-citizen-desktop-nav">
      {citizenNavigation.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            isCitizenRouteActive(pathname, href) ? "page" : undefined
          }
        >
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
