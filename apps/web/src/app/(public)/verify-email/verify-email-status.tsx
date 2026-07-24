"use client";

import { useActionState } from "react";
import Link from "next/link";
import { verifyEmail, type VerifyEmailState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { RiCheckboxCircleLine, RiLoader4Line } from "@remixicon/react";
import { FormAlert } from "@/components/form-alert";
import { ResendVerificationForm } from "../_components/resend-verification-form";

/**
 * Redeems the verification token behind an explicit confirm click, mirroring
 * the reset-password form. Auto-redeeming on load would let mail-security
 * scanners (Safe Links, Proofpoint, etc.), which execute JS while pre-checking
 * links, burn the single-use token before the person ever saw the page.
 */
export function VerifyEmailStatus({ token }: { token: string }) {
  const [state, action, pending] = useActionState<VerifyEmailState, FormData>(
    verifyEmail,
    null
  );

  if (!token) {
    return (
      <div className="space-y-4">
        <FormAlert>
          This verification link is missing its token. Enter your email below
          and we&apos;ll send you a fresh one.
        </FormAlert>
        <ResendVerificationForm />
      </div>
    );
  }

  if (state?.status === "success") {
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

  if (state?.status === "error") {
    return (
      <div className="space-y-4">
        <FormAlert>{state.message}</FormAlert>
        <ResendVerificationForm />
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <RiLoader4Line className="size-4 animate-spin" />
            Confirming...
          </>
        ) : (
          "Confirm my email"
        )}
      </Button>
    </form>
  );
}
