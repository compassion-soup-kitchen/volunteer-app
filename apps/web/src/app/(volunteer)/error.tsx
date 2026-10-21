"use client";

import { RouteError } from "@/components/brand/route-error";

/** Catches a failed volunteer page inside the layout, so the nav stays. */
export default function VolunteerError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={retry}
      description="Something on our side got in the way - it wasn't anything you did. Give it another go, and if it keeps happening, let a coordinator know."
      home={{ href: "/dashboard", label: "Back to my dashboard" }}
    />
  );
}
