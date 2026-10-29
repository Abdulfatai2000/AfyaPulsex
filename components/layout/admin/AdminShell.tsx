"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, BadgeCheck, ClipboardList, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

const navigation = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/officers", label: "Officer Management", icon: BadgeCheck },
  { href: "/admin/audit", label: "Audit Log", icon: ClipboardList },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-shell min-h-screen bg-gray-50">
      <header className="admin-header bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="flex items-center gap-2">
                <span className="text-xl font-bold text-[#08214A]">AfyaPulse Admin</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1" aria-label="Admin navigation">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#1267E8] text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-[#08214A]"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="size-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/auth" })}
              >
                <LogOut className="size-4 mr-2" aria-hidden="true" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        {children}
      </main>
    </div>
  );
}