"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  RiDashboardLine,
  RiCalendarLine,
  RiUserLine,
  RiLogoutBoxLine,
  RiTimeLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: RiDashboardLine },
  { href: "/shifts", label: "Shifts", icon: RiCalendarLine },
  { href: "/hours", label: "Hours", icon: RiTimeLine },
  { href: "/profile", label: "Profile", icon: RiUserLine },
];

export function VolunteerNav({
  user,
}: {
  user: { name?: string | null; email?: string | null };
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/favicon-192x192.png" alt="Te Pūaroha" className="size-8" />
            <span className="text-sm font-semibold tracking-tight">
              Te Pūaroha
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.name || user.email}
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => signOut({ redirectTo: "/" })}
              aria-label="Sign out"
            >
              <RiLogoutBoxLine className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background sm:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop nav is handled by the top bar links - can extend later */}
    </>
  );
}
