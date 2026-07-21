"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Kowhaiwhai } from "@/components/brand/kowhaiwhai";
import { Wordmark } from "@/components/brand/wordmark";
import { RiArrowLeftLine, RiRefreshLine } from "@remixicon/react";

/**
 * Root error boundary — catches render/data errors below the root layout.
 * Shows a gentle, branded fallback with a retry; never surfaces stack traces.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for observability — the person only ever sees the friendly copy.
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-center text-foreground">
      <Kowhaiwhai
        className="pointer-events-none absolute -right-40 -top-28 w-[640px] opacity-[0.05]"
      />

      <div className="relative w-full max-w-md">
        <Link href="/" aria-label="Te Pūaroha home" className="inline-flex">
          <Wordmark className="h-7" />
        </Link>

        <Eyebrow className="mt-12 text-primary">Aue · Something went wrong</Eyebrow>
        <h1 className="mt-4 font-serif text-4xl font-light leading-[1.08] tracking-tight text-balance sm:text-5xl">
          That didn&apos;t go to plan
        </h1>
        <span aria-hidden className="mx-auto mt-5 block h-0.5 w-16 rounded-full bg-primary" />
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          Something hiccuped on our side — it wasn&apos;t you. Give it another
          go, and if it keeps happening, let the coordinator team know.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RiRefreshLine data-icon="inline-start" className="size-4" />
            Try again
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/">
              <RiArrowLeftLine data-icon="inline-start" className="size-4" />
              Back to the homepage
            </Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="mt-10 font-mono text-xs tracking-tight text-muted-foreground/60">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
