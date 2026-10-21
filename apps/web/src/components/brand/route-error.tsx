"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { RiArrowLeftLine, RiLoader4Line, RiRefreshLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "./eyebrow";

interface RouteErrorProps {
  error: Error & { digest?: string };
  /** The boundary's `retry`: re-fetches the segment, so a passing blip recovers. */
  retry: () => void;
  /** What went wrong and what to do, in the area's own voice. */
  description: React.ReactNode;
  /** Where "back" goes - the dashboard of whichever app this is. */
  home: { href: string; label: string };
}

/**
 * RouteError - the body of an in-layout `error.tsx`. It renders inside the
 * area's layout, so the nav stays put and the way out is a dashboard, not
 * the marketing homepage the root boundary falls back to.
 */
export function RouteError({ error, retry, description, home }: RouteErrorProps) {
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    // Logged for observability - the person only ever sees the friendly copy.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-12 text-center sm:py-20">
      <Eyebrow>Aue · Something went wrong</Eyebrow>
      <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-balance sm:text-4xl">
        This page didn&apos;t load
      </h1>
      <span aria-hidden className="mt-5 block h-0.5 w-12 rounded-full bg-primary" />
      <p className="mt-5 text-base text-pretty text-muted-foreground">{description}</p>

      <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
        <Button onClick={() => startRetry(retry)} disabled={retrying}>
          {retrying ? (
            <RiLoader4Line data-icon="inline-start" className="size-4 animate-spin" aria-hidden />
          ) : (
            <RiRefreshLine data-icon="inline-start" className="size-4" aria-hidden />
          )}
          {retrying ? "Trying again…" : "Try again"}
        </Button>
        <Button variant="outline" asChild>
          <Link href={home.href}>
            <RiArrowLeftLine data-icon="inline-start" className="size-4" aria-hidden />
            {home.label}
          </Link>
        </Button>
      </div>

      {error.digest ? (
        <p className="mt-10 font-mono text-xs tracking-tight text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
