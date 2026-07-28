"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";
import {
  RiDashboardLine,
  RiTeamLine,
  RiGroupLine,
  RiFileListLine,
  RiCalendarLine,
  RiLogoutBoxLine,
  RiMenuLine,
  RiCloseLine,
  RiMapPinLine,
  RiGraduationCapLine,
  RiFileTextLine,
  RiMegaphoneLine,
  RiBarChartBoxLine,
  RiSettings3Line,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: typeof RiDashboardLine };
type NavGroup = { label: string | null; items: NavItem[] };

export function StaffNav({
  user,
}: {
  user: { name?: string | null; role: string };
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const groups: NavGroup[] = [
    {
      label: null,
      items: [
        { href: "/staff/dashboard", label: "Dashboard", icon: RiDashboardLine },
      ],
    },
    {
      label: "Ngā tāngata · People",
      items: [
        { href: "/staff/applications", label: "Applications", icon: RiFileListLine },
        { href: "/staff/volunteers", label: "Volunteers", icon: RiTeamLine },
        { href: "/staff/groups", label: "Groups", icon: RiGroupLine },
      ],
    },
    {
      label: "Ngā mahi · Operations",
      items: [
        { href: "/staff/shifts", label: "Shifts", icon: RiCalendarLine },
        { href: "/staff/training", label: "Training", icon: RiGraduationCapLine },
        ...(user.role === "ADMIN"
          ? [{ href: "/staff/service-areas", label: "Service areas", icon: RiMapPinLine }]
          : []),
      ],
    },
    {
      label: "Kōrero · Comms",
      items: [
        { href: "/staff/announcements", label: "Announcements", icon: RiMegaphoneLine },
        { href: "/staff/documents", label: "Documents", icon: RiFileTextLine },
        { href: "/staff/reports", label: "Reports", icon: RiBarChartBoxLine },
      ],
    },
  ];

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group, gi) => (
        <div key={group.label ?? gi} className={gi > 0 ? "mt-5" : undefined}>
          {group.label && (
            <p className="eyebrow mb-1.5 px-3 text-[0.62rem] text-sidebar-foreground/50">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        : "font-medium text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {/* Red mission tick on the active room */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary transition-opacity",
                        isActive ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-sidebar-border px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        {/* The identity block doubles as the way in to your own account. */}
        <Link
          href="/staff/account"
          onClick={() => setSidebarOpen(false)}
          aria-label="My account"
          aria-current={pathname === "/staff/account" ? "page" : undefined}
          className={cn(
            "group/account -mx-2 flex min-w-0 items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-sidebar-accent/60",
            pathname === "/staff/account" && "bg-sidebar-accent"
          )}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-sidebar-accent-foreground">
              {user.name}
            </span>
            <span className="eyebrow block truncate text-[0.6rem] text-sidebar-foreground/50">
              {user.role === "ADMIN" ? "Admin" : "Coordinator"}
            </span>
          </span>
          <RiSettings3Line className="size-3.5 shrink-0 text-sidebar-foreground/40 transition-colors group-hover/account:text-sidebar-accent-foreground" />
        </Link>
        <div className="flex shrink-0 items-center">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => signOut({ redirectTo: "/" })}
            aria-label="Sign out"
          >
            <RiLogoutBoxLine className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Top bar (mobile only) */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <RiCloseLine className="size-5" /> : <RiMenuLine className="size-5" />}
            </Button>
            <Link href="/staff/dashboard" aria-label="Te Pūaroha dashboard">
              <Wordmark className="h-6" />
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
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

      {/* Ink sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <Link href="/staff/dashboard" aria-label="Te Pūaroha dashboard" className="shrink-0">
            <Wordmark tone="white" className="h-5 w-auto" />
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <RiCloseLine className="size-4" />
          </Button>
        </div>
        {nav}
        {footer}
      </aside>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
