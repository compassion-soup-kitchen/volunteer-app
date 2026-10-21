"use client";

import { RouteError } from "@/components/brand/route-error";

/** Catches a failed staff page inside the layout, so the sidebar stays. */
export default function StaffError({
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
      description="Something on our side got in the way. Give it another go, or carry on from the dashboard. If it keeps happening, pass the reference below to whoever looks after the app."
      home={{ href: "/staff/dashboard", label: "Back to the dashboard" }}
    />
  );
}
