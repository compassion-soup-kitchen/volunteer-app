"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  RiArrowRightLine,
  RiMenuLine,
  RiCloseLine,
} from "@remixicon/react";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/favicon-192x192.png" alt="Te Pūaroha" className="size-9" />
          <div className="leading-none">
            <span className="text-base font-semibold tracking-tight">
              Te Pūaroha
            </span>
            <span className="ml-1.5 hidden text-sm text-muted-foreground sm:inline">
              Compassion Soup Kitchen
            </span>
          </div>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <a
            href="#about"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Our Story
          </a>
          <a
            href="#volunteer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Volunteer
          </a>
          <a
            href="#impact"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Impact
          </a>
          <a
            href="#contact"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </a>
          <div className="mx-1 h-4 w-px bg-border" />
          <a href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Sign In
          </a>
          <Button size="sm" asChild>
            <a href="/register">
              Sign Up
              <RiArrowRightLine data-icon="inline-end" className="size-3.5" />
            </a>
          </Button>
          <ThemeToggle />
        </div>

        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? (
            <RiCloseLine className="size-5" />
          ) : (
            <RiMenuLine className="size-5" />
          )}
        </Button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-border/50 bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <a
              href="#about"
              className="text-base text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              Our Story
            </a>
            <a
              href="#volunteer"
              className="text-base text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              Volunteer
            </a>
            <a
              href="#impact"
              className="text-base text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              Impact
            </a>
            <a
              href="#contact"
              className="text-base text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              Contact
            </a>
            <div className="flex items-center justify-between">
              <span className="text-base text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <Separator />
            <Button size="sm" className="w-full" asChild>
              <a href="/register">Sign Up</a>
            </Button>
            <a
              href="/login"
              className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Already have an account? Sign In
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
