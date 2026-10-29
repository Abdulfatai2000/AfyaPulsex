"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { citizenMobileNavigation, isCitizenRouteActive } from "./navigation";
export function CitizenMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Citizen mobile navigation"
      className="ap-citizen-mobile-nav"
    >
      {citizenMobileNavigation.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-label={href === "/report" ? "Report a health signal" : label}
          aria-current={
            isCitizenRouteActive(pathname, href) ? "page" : undefined
          }
          className={href === "/report" ? "ap-mobile-report" : undefined}
        >
          <span className="ap-mobile-nav-icon">
            <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
