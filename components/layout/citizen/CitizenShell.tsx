"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { Bell, UserRound, ShieldCheck, LogOut } from "lucide-react";
import { AppLogo } from "@/components/shared/AppLogo";
import { CitizenDesktopNav } from "./CitizenDesktopNav";
import { CitizenMobileNav } from "./CitizenMobileNav";
import { CitizenVitalsShortcut } from "./CitizenVitalsShortcut";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
// TODO(DEV4): enforce citizen route access at the server boundary and supply
// authenticated identity. The shell intentionally makes no session claim.
export function CitizenShell({ children, isDemo = false }: { children: ReactNode; isDemo?: boolean }) {
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
    setLogoutOpen(false);
  };

  return (
    <div className="ap-citizen">
      <a href="#citizen-content" className="ap-skip-link">
        Skip to content
      </a>
      <header className="ap-citizen-header">
        <div className="ap-citizen-header-start">
          <div className="ap-citizen-header-brand">
            <AppLogo />
          </div>
          <div className="ap-citizen-header-label">
            <span>YOUR HEALTH, CONNECTED</span>
            <p>Citizen App</p>
          </div>
        </div>
        <nav aria-label="Account shortcuts" className="ap-citizen-shortcuts">
          <CitizenVitalsShortcut />
          <Link
            href="/alerts"
            aria-label="Health alerts"
            className="ap-icon-button"
          >
            <Bell aria-hidden="true" className="size-5" />
          </Link>
          <Link
            href="/profile"
            aria-label="Profile and settings"
            className="ap-profile-shortcut"
          >
            <UserRound aria-hidden="true" className="size-5" />
          </Link>
        </nav>
      </header>
      <div className="ap-citizen-workspace">
        <aside className="ap-citizen-sidebar">
          <CitizenDesktopNav />
          <div className="ap-citizen-tagline">
            <ShieldCheck aria-hidden="true" className="size-5" />
            <p>
              A Healthier Nigeria.
              <br />
              <strong>Together.</strong>
            </p>
          </div>
          <div className="flex shrink-0 border-t border-gray-200 px-3 py-4">
            <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <DialogTrigger render={
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-danger-red hover:bg-danger-red/15"
                  aria-label="Log Out"
                >
                  <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>Log Out</span>
                </button>
              } />
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Sign out of AfyaPulse?</DialogTitle>
                  <DialogDescription>
                    You will be returned to the sign-in screen. Any unfinished
                    work will be discarded.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setLogoutOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleSignOut}>
                    Sign out
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </aside>
        <main id="citizen-content" tabIndex={-1} className="ap-citizen-content">
          {isDemo && <p role="status" className="mb-3 text-sm text-amber-900">Demo Account &middot; Synthetic Data &middot; Read-only</p>}
          {children}
        </main>
      </div>
      <CitizenMobileNav />
    </div>
  );
}
