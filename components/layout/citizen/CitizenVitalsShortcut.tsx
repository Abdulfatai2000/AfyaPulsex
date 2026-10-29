"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { isCitizenRouteActive } from "./navigation";

/** Preserve the existing mobile shortcut while identifying the active Vitals page. */
export function CitizenVitalsShortcut() {
  const pathname = usePathname();
  return (
    <Link
      href="/vitals"
      className="ap-vitals-shortcut"
      aria-current={
        isCitizenRouteActive(pathname, "/vitals") ? "page" : undefined
      }
    >
      <HeartPulse aria-hidden="true" className="size-4" />
      <span>Vitals</span>
    </Link>
  );
}
