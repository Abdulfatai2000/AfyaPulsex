"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { AppLogo } from "@/components/shared/AppLogo";
import { BackButton } from "@/components/feedback/BackButton";
import { dashboardHrefFor } from "@/components/feedback/dashboard-href";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const pathname = usePathname();

  return (
    <main className="flex min-h-[70vh] min-w-0 flex-col items-center px-4 py-12 sm:px-6">
      <section
        aria-labelledby="not-found-title"
        className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm"
      >
        <div className="flex justify-center">
          <AppLogo />
        </div>
        <div className="mx-auto mt-6 flex size-11 items-center justify-center rounded-full bg-primary/10">
          <FileQuestion
            className="size-5 text-primary-blue"
            aria-hidden="true"
          />
        </div>
        <h1
          id="not-found-title"
          className="mt-4 text-xl font-bold text-deep-navy"
        >
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have
          been moved.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <BackButton />
          <Link
            href={dashboardHrefFor(pathname)}
            className={buttonVariants()}
          >
            Go to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
