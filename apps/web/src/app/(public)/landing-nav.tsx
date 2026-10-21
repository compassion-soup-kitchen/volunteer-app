"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RiHandHeartLine, RiMenuLine, RiCloseLine } from "@remixicon/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";

const links = [
  { href: "#app", label: "The app" },
  { href: "#features", label: "Features" },
  { href: "#story", label: "Our story" },
  { href: "#contact", label: "Contact" },
];

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <nav aria-label="Main" className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Te Pūaroha home" className="shrink-0">
          <Wordmark className="h-6 sm:h-7" />
        </Link>

        {/* Desktop nav - from xl only: the wordmark plus every link needs about
            1150px, and anything narrower wraps the links into the wordmark. */}
        <div className="hidden items-center gap-7 whitespace-nowrap xl:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <div className="mx-1 h-4 w-px bg-border" />
          <a
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </a>
          <Button size="sm" asChild>
            <a href="/register">
              <RiHandHeartLine data-icon="inline-start" className="size-3.5" />
              Become a volunteer
            </a>
          </Button>
          <ThemeToggle />
        </div>

        {/* Mobile menu toggle */}
        <Button
          ref={toggleRef}
          variant="ghost"
          size="icon"
          className="xl:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="landing-menu"
        >
          {menuOpen ? <RiCloseLine className="size-5" /> : <RiMenuLine className="size-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="landing-menu"
          className="border-t border-border/60 bg-background px-6 py-4 xl:hidden"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeMenu();
          }}
        >
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-base text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-base text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <Separator />
            <Button className="w-full" asChild>
              <a href="/register" onClick={() => setMenuOpen(false)}>
                <RiHandHeartLine data-icon="inline-start" className="size-4" />
                Become a volunteer
              </a>
            </Button>
            <a
              href="/login"
              className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Already a volunteer? Sign in
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
