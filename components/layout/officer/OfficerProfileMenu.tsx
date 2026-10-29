"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutOfficer } from "@/lib/services/officer/profile";
import { useOfficerProfile } from "./OfficerProfileContext";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function VerifiedBadge() {
  // Solid opaque green pill: stays fully legible over the header image
  // (a translucent badge lets the background show through).
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-success-green px-2.5 py-1 text-[10px] font-semibold leading-none text-white">
      Verified
    </span>
  );
}

export function OfficerProfileMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { profile } = useOfficerProfile();

  const isVerified = profile?.verificationStatus === "verified";

  // UI integration point only. TODO(DEV4): wire sign out to the next-auth
  // boundary once it exists — do not implement authentication here.
  const handleSignOut = () => {
    void signOutOfficer();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open officer profile menu"
        className="flex items-center gap-2 rounded-lg p-1 outline-none transition-colors hover:bg-blue-900/40 focus-visible:ring-2 focus-visible:ring-primary-blue/60"
      >
        <Avatar className="size-8">
          {profile?.avatarUrl ? (
            <AvatarImage src={profile.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback aria-hidden="true">
            {profile ? initials(profile.name) : "…"}
          </AvatarFallback>
        </Avatar>
        {!compact && (
          <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="max-w-36 truncate text-sm font-semibold text-white">
                {profile?.name ?? "…"}
              </span>
              {isVerified ? <VerifiedBadge /> : null}
            </span>
            <span className="max-w-40 truncate text-xs text-blue-200">
              {profile?.role ?? "…"}
            </span>
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="w-72">
        <div className="px-2.5 py-2">
          {profile ? (
            <>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-deep-navy">
                {profile.name}
                {isVerified ? <VerifiedBadge /> : null}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[profile.role, profile.organization]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {profile.jurisdiction ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {profile.jurisdiction}
                </p>
              ) : null}
            </>
          ) : (
            <div className="space-y-1.5" aria-hidden="true">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
          )}
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {profile?.verificationStatus === "verified"
              ? "Verification: Approved"
              : "Verification: Pending"}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/officer/profile")}>
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/officer/settings")}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

