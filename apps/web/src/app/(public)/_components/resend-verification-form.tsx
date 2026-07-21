"use client";

import { useActionState } from "react";
import {
  resendVerificationEmail,
  type ResendVerificationState,
} from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiLoader4Line } from "@remixicon/react";
import { EmailSentNotice } from "./email-sent-notice";

/**
 * Requests a fresh verification link. With a known `email` (register panel,
 * unverified sign-in) it renders as a single button; without one (verify-email
 * page reached from a dead link) it asks for the address first.
 */
export function ResendVerificationForm({ email }: { email?: string }) {
  const [state, action, pending] = useActionState<
    ResendVerificationState,
    FormData
  >(resendVerificationEmail, null);

  if (state?.success) {
    return <EmailSentNotice message={state.success} />;
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <div className="space-y-2">
          <Label htmlFor="resend-email">Email</Label>
          <Input
            id="resend-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={pending}
          />
        </div>
      )}

      <Button
        type="submit"
        variant={email ? "outline" : "default"}
        className="w-full"
        disabled={pending}
      >
        {pending ? (
          <>
            <RiLoader4Line className="size-4 animate-spin" />
            Sending link...
          </>
        ) : (
          "Resend verification email"
        )}
      </Button>
    </form>
  );
}
