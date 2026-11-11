"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { RiAppleFill, RiGoogleFill, RiLoader4Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { OrDivider } from "./or-divider";

type Provider = "apple" | "google";

/** Apple's approved button titles, matched for Google so the pair reads as one. */
const LABELS: Record<"sign-in" | "sign-up", Record<Provider, string>> = {
  "sign-in": { apple: "Continue with Apple", google: "Continue with Google" },
  "sign-up": { apple: "Sign up with Apple", google: "Sign up with Google" },
};

/**
 * Sign in (or up) with Apple or Google, under an "or" rule. Both double as
 * sign-up: a first-time identity becomes a PUBLIC applicant either way.
 *
 * Apple leads and only appears when the server has its credentials -
 * offering a button that can only fail is worse than not offering it. Apple's
 * guidelines also ask for its button to be at least as prominent as any other
 * provider's, which the stacking order and full width give it.
 */
export function IdentityProviders({
  intent,
  appleEnabled,
}: {
  intent: "sign-in" | "sign-up";
  appleEnabled: boolean;
}) {
  // Each provider leaves the page, so a pending state only needs to cover the
  // moment between the click and the browser navigating away.
  const [pending, setPending] = useState<Provider | null>(null);
  const labels = LABELS[intent];

  // Coming Back from the provider's page restores this one from the
  // back/forward cache with the spinner still going; clear it.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(null);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  function start(provider: Provider) {
    setPending(provider);
    void signIn(provider, { redirectTo: "/dashboard" }).catch(() =>
      setPending(null)
    );
  }

  const icon = (provider: Provider) =>
    pending === provider ? (
      <RiLoader4Line className="size-4 animate-spin" />
    ) : provider === "apple" ? (
      <RiAppleFill className="size-4" />
    ) : (
      <RiGoogleFill className="size-4" />
    );

  return (
    <>
      <OrDivider>or</OrDivider>

      <div className="space-y-3">
        {appleEnabled && (
          <Button
            type="button"
            variant="apple"
            className="w-full"
            disabled={pending !== null}
            onClick={() => start("apple")}
          >
            {icon("apple")}
            {labels.apple}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending !== null}
          onClick={() => start("google")}
        >
          {icon("google")}
          {labels.google}
        </Button>
      </div>
    </>
  );
}
