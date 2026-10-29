"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { AppLogo } from "@/components/shared/AppLogo";
const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "For your health" },
  { href: "/#privacy", label: "Privacy first" },
];
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="ap-public-header">
      <div className="ap-container flex min-h-20 items-center justify-between gap-4">
        <AppLogo />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 text-sm font-medium lg:flex"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="ap-text-link">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-6 sm:flex">
          <Link href="/auth" className="ap-text-link text-sm font-semibold">
            Sign in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="ap-button ap-button-primary"
          >
            Get Started <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <button
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="public-mobile-menu"
          onClick={() => setOpen(!open)}
          className="ap-icon-button lg:hidden"
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <nav
          id="public-mobile-menu"
          aria-label="Mobile main navigation"
          className="ap-container grid gap-1 border-t py-4 lg:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-3 font-medium"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/auth"
            onClick={() => setOpen(false)}
            className="rounded-lg px-2 py-3 font-medium"
          >
            Sign in
          </Link>
          <Link
            href="/auth?mode=signup"
            onClick={() => setOpen(false)}
            className="ap-button ap-button-primary mt-2"
          >
            Get Started
          </Link>
        </nav>
      )}
    </header>
  );
}
