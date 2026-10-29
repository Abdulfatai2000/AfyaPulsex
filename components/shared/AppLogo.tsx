import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";

export function AppLogo({
  showText = true,
  textClassName,
}: {
  showText?: boolean;
  /** Extra classes for the wordmark (e.g. responsive visibility). */
  textClassName?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="AfyaPulse home"
      className="flex min-w-0 shrink-0 items-center gap-2 text-lg font-bold"
    >
      <Image
        src="/images/afyapulse-logo.png"
        alt="AfyaPulse logo"
        width={707}
        height={353}
        className="h-6 w-auto shrink-0"
      />
      {showText ? (
        <span className={cn("min-w-0 truncate", textClassName)}>
          AfyaPulse
        </span>
      ) : null}
    </Link>
  );
}