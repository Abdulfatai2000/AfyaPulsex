"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { AppLogo } from "@/components/shared/AppLogo";
import { Button, buttonVariants } from "@/components/ui/button";
import { dashboardHrefFor } from "./dashboard-href";

/**
 * Shared route error boundary UI (used by every segment error.tsx).
 * Branded, accessible, and safe: technical details (message, stack, digest)
 * are never rendered — only the digest is logged for developers.
 */
export function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Developer signal only: digest identifies the server log entry.
    // Never render message/stack/digest in the UI.
    console.error("[RouteError]", error.digest ?? "unknown");
  }, [error.digest]);

  return (
    <div className="flex min-w-0 flex-col items-center px-4 py-12 sm:px-6">
      <section
        role="alert"
        aria-labelledby="route-error-title"
        className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm"
      >
        <div className="flex justify-center">
          <AppLogo />
        </div>
        <div className="mx-auto mt-6 flex size-11 items-center justify-center rounded-full bg-destructive/10">
          <TriangleAlert
            className="size-5 text-destructive"
            aria-hidden="true"
          />
        </div>
        <h1
          id="route-error-title"
          className="mt-4 text-xl font-bold text-deep-navy"
        >
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&rsquo;re having trouble loading this page right now. Please try
          again or return to your dashboard.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" onClick={retry}>
            Try Again
          </Button>
          <Link
            href={dashboardHrefFor(pathname)}
            className={buttonVariants({ variant: "outline" })}
          >
            Go to Dashboard
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Still having trouble? Contact your administrator.
        </p>
      </section>
    </div>
  );
}
