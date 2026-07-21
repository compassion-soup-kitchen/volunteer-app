"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { verifyEmail, type VerifyEmailState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { RiCheckboxCircleLine, RiLoader4Line } from "@remixicon/react";
import { ResendVerificationForm } from "../_components/resend-verification-form";

/**
 * Redeems the verification token as soon as the page loads. The redemption is
 * a Server Action (a POST), so inbox link-scanners prefetching the URL with a
 * GET can't burn the single-use token before the person arrives.
 */
export function VerifyEmailStatus({ token }: { token: string }) {
  const [state, action, pending] = useActionState<VerifyEmailState, string>(
    verifyEmail,
    null
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;
    startTransition(() => action(token));
  }, [token, action]);

  if (!token) {
    return (
      <div className="space-y-4">
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          This verification link is missing its token. Enter your email below
          and we&apos;ll send you a fresh one.
        </div>
        <ResendVerificationForm />
      </div>
    );
  }

  if (pending || !state) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/60 p-5 text-sm text-muted-foreground">
        <RiLoader4Line className="size-5 shrink-0 animate-spin text-primary" />
        Confirming your email address...
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-secondary/60 p-5">
          <div className="flex items-start gap-3">
            <RiCheckboxCircleLine className="mt-0.5 size-5 shrink-0 text-success" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                Email confirmed - ka pai!
              </p>
              <p className="leading-relaxed text-muted-foreground">
                Your account is ready to use. Sign in whenever you&apos;re
                ready, and we&apos;ll take it from there.
              </p>
            </div>
          </div>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="alert"
        className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
      >
        {state.message}
      </div>
      <ResendVerificationForm />
    </div>
  );
}
