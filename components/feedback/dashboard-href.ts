/**
 * Dashboard target matching the section a failure/404 occurred in.
 * Shared by the route error boundary and the not-found page so recovery
 * navigation stays contextual without duplicating the mapping.
 */
export function dashboardHrefFor(pathname: string | null): string {
  if (pathname?.startsWith("/officer")) return "/officer/overview";
  if (
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/my-health") ||
    pathname?.startsWith("/vitals") ||
    pathname?.startsWith("/report") ||
    pathname?.startsWith("/profile") ||
    pathname?.startsWith("/alerts")
  ) {
    return "/dashboard";
  }
  return "/";
}
