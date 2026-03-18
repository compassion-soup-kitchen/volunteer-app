"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  RiHeartLine,
  RiDashboardLine,
  RiTeamLine,
  RiFileListLine,
  RiCalendarLine,
  RiLogoutBoxLine,
  RiMenuLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const sidebarItems = [
  { href: "/staff/dashboard", label: "Dashboard", icon: RiDashboardLine },
  { href: "/staff/applications", label: "Applications", icon: RiFileListLine },
  { href: "/staff/volunteers", label: "Volunteers", icon: RiTeamLine },
  { href: "/staff/shifts", label: "Shifts", icon: RiCalendarLine },
];

export function StaffNav({
  user,
}: {
  user: { name?: string | null; role: string };
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm lg:pl-60">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <RiMenuLine className="size-5" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {user.role === "ADMIN" ? "Administrator" : "Coordinator"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.name}
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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-dvh w-60 border-r border-border bg-sidebar transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex size-8 items-center justify-center bg-sidebar-primary">
            <RiHeartLine className="size-4 text-sidebar-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Te Pūaroha
          </span>
        </div>
        <nav className="p-3">
          <ul className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
