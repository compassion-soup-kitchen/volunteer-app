"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  RiDashboardLine,
  RiTeamLine,
  RiGroupLine,
  RiFileListLine,
  RiCalendar2Line,
  RiCalendarLine,
  RiCalendarEventLine,
  RiLogoutBoxLine,
  RiMenuLine,
  RiCloseLine,
  RiMapPinLine,
  RiGraduationCapLine,
  RiFileTextLine,
  RiMegaphoneLine,
  RiBarChartBoxLine,
  RiSettings3Line,
  RiSuitcaseLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { useEffect, useId, useState } from "react";

type NavItem = { href: string; label: string; icon: typeof RiDashboardLine };
type NavGroup = { label: string | null; items: NavItem[] };

export function StaffNav({
  user,
}: {
  user: { name?: string | null; role: string };
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The sheet only exists below lg. Widening the window past it would leave
  // an open sheet's scrim over the docked sidebar, so close it there.
  useEffect(() => {
    const docked = window.matchMedia("(min-width: 64rem)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setSidebarOpen(false);
    };
    docked.addEventListener("change", onChange);
    return () => docked.removeEventListener("change", onChange);
  }, []);

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
        { href: "/staff/leave", label: "Leave", icon: RiSuitcaseLine },
      ],
    },
    {
      label: "Ngā mahi · Operations",
      items: [
        { href: "/staff/calendar", label: "Calendar", icon: RiCalendar2Line },
        { href: "/staff/shifts", label: "Shifts", icon: RiCalendarLine },
        { href: "/staff/training", label: "Training", icon: RiGraduationCapLine },
        { href: "/staff/events", label: "Events", icon: RiCalendarEventLine },
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

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      {/* Top bar (below lg) */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Open navigation">
                <RiMenuLine className="size-5" />
              </Button>
            </SheetTrigger>
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

      {/* Ink sidebar, docked from lg. Below that it is display:none, so none of
          its links sit in the tab order - the sheet carries the same panel. */}
      <aside className="fixed left-0 top-0 z-50 hidden h-dvh w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarPanel groups={groups} user={user} pathname={pathname} />
      </aside>

      {/* The same panel as a modal sheet below lg: focus is trapped while it is
          open, Escape and the scrim close it, and focus returns to the toggle. */}
      <SheetContent
        side="left"
        showCloseButton={false}
        aria-describedby={undefined}
        className="w-64 bg-sidebar text-sidebar-foreground sm:max-w-64 lg:hidden"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarPanel
          groups={groups}
          user={user}
          pathname={pathname}
          onNavigate={() => setSidebarOpen(false)}
          closeButton={
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={sidebarIconButton}
                aria-label="Close navigation"
              >
                <RiCloseLine className="size-4" />
              </Button>
            </SheetClose>
          }
        />
      </SheetContent>
    </Sheet>
  );
}

/** Ghost icon buttons on the ink panel: sidebar hover, and a ring that shows on ink. */
const sidebarIconButton =
  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent focus-visible:border-transparent focus-visible:ring-sidebar-ring";

/** Links on the ink panel. The global navy ring vanishes against ink. */
const sidebarFocus =
  "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

function SidebarPanel({
  groups,
  user,
  pathname,
  onNavigate,
  closeButton,
}: {
  groups: NavGroup[];
  user: { name?: string | null; role: string };
  pathname: string;
  onNavigate?: () => void;
  closeButton?: React.ReactNode;
}) {
  const onAccount = pathname === "/staff/account";
  // The panel renders twice (docked aside + sheet), so ids must be unique.
  const idPrefix = useId();

  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border px-5">
        {/* Free to shrink, so the sheet's close button never lands on the lockup */}
        <Link
          href="/staff/dashboard"
          onClick={onNavigate}
          aria-label="Te Pūaroha dashboard"
          className={cn("-mx-1 min-w-0 rounded-sm px-1 py-1", sidebarFocus)}
        >
          <Wordmark tone="white" className="h-5 w-auto max-w-full object-contain object-left" />
        </Link>
        {closeButton}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group, gi) => {
          const labelId = group.label ? `${idPrefix}-group-${gi}` : undefined;
          return (
            <div key={group.label ?? gi} className={gi > 0 ? "mt-5" : undefined}>
              {group.label && (
                <p
                  id={labelId}
                  className="eyebrow mb-1.5 px-3 text-[0.62rem] text-sidebar-muted-foreground"
                >
                  {group.label}
                </p>
              )}
              <ul aria-labelledby={labelId} className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          sidebarFocus,
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
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* The identity block doubles as the way in to your own account. */}
          <Link
            href="/staff/account"
            onClick={onNavigate}
            aria-label="My account"
            aria-current={onAccount ? "page" : undefined}
            className={cn(
              "group/account -mx-2 flex min-w-0 items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-sidebar-accent/60",
              sidebarFocus,
              onAccount && "bg-sidebar-accent"
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-sidebar-accent-foreground">
                {user.name}
              </span>
              <span className="eyebrow block truncate text-[0.6rem] text-sidebar-muted-foreground">
                {user.role === "ADMIN" ? "Admin" : "Coordinator"}
              </span>
            </span>
            <RiSettings3Line className="size-3.5 shrink-0 text-sidebar-muted-foreground transition-colors group-hover/account:text-sidebar-accent-foreground" />
          </Link>
          <div className="flex shrink-0 items-center">
            <ThemeToggle className={sidebarIconButton} />
            <Button
              variant="ghost"
              size="icon-sm"
              className={sidebarIconButton}
              onClick={() => signOut({ redirectTo: "/" })}
              aria-label="Sign out"
            >
              <RiLogoutBoxLine className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
