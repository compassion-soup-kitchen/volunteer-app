import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Kowhaiwhai } from "@/components/brand/kowhaiwhai";
import { Wordmark } from "@/components/brand/wordmark";
import { RiArrowLeftLine, RiHomeHeartLine } from "@remixicon/react";

export const metadata: Metadata = {
  title: "Kei te ngaro — Page not found | Te Pūaroha",
};

/**
 * Root 404 — shown for unknown URLs and any notFound() thrown in the tree.
 * Renders inside the root layout, so brand fonts and theme tokens are available.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-center text-foreground">
      <Kowhaiwhai
        className="pointer-events-none absolute -right-40 -top-28 w-[640px] opacity-[0.05]"
      />

      <div className="relative w-full max-w-md">
        <Link href="/" aria-label="Te Pūaroha home" className="inline-flex">
          <Wordmark className="h-7" />
        </Link>

        <Eyebrow className="mt-12 text-primary">Kei te ngaro · Page not found</Eyebrow>
        <h1 className="mt-4 font-serif text-4xl font-light leading-[1.08] tracking-tight text-balance sm:text-5xl">
          This page has wandered off
        </h1>
        <span aria-hidden className="mx-auto mt-5 block h-0.5 w-16 rounded-full bg-primary" />
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          Whatever lived here has moved on, or the link is a little out of date.
          No harm done — let&apos;s get you back to the kai and the mahi.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/">
              <RiArrowLeftLine data-icon="inline-start" className="size-4" />
              Back to the homepage
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/dashboard">
              <RiHomeHeartLine data-icon="inline-start" className="size-4" />
              My dashboard
            </Link>
          </Button>
        </div>

        <p className="mt-10 font-mono text-xs tracking-tight text-muted-foreground/60">
          Error 404
        </p>
      </div>
    </main>
  );
}
