"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";
import {
  RiHome5Line,
  RiHome5Fill,
  RiCalendarLine,
  RiCalendarFill,
  RiTimeLine,
  RiTimeFill,
  RiGraduationCapLine,
  RiGraduationCapFill,
  RiUserLine,
  RiUserFill,
  RiLogoutBoxLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: RiHome5Line, iconActive: RiHome5Fill },
  { href: "/shifts", label: "Shifts", icon: RiCalendarLine, iconActive: RiCalendarFill },
  { href: "/hours", label: "Impact", icon: RiTimeLine, iconActive: RiTimeFill },
  { href: "/training", label: "Training", icon: RiGraduationCapLine, iconActive: RiGraduationCapFill },
  { href: "/profile", label: "Profile", icon: RiUserLine, iconActive: RiUserFill },
];

export function VolunteerNav({
  user,
}: {
  user: { name?: string | null; email?: string | null };
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar — quiet editorial masthead */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/dashboard" aria-label="Te Pūaroha dashboard">
            <Wordmark className="h-6" />
          </Link>

          {/* Desktop nav links — text-only, active carries a red underline */}
          <nav className="hidden items-center gap-5 sm:flex">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative py-1 text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-[calc(--spacing(1)+1px)] after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity",
                    isActive
                      ? "font-semibold text-foreground after:opacity-100"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <span className="sr-only">{user.name || user.email}</span>
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

      {/* Bottom tab bar (mobile) — the app's five tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:hidden">
        <div className="flex items-stretch justify-around">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = isActive ? item.iconActive : item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-14 flex-col items-center gap-0.5 px-2 pt-2 pb-1.5 text-[11px] transition-colors",
                  isActive
                    ? "font-semibold text-primary"
                    : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
