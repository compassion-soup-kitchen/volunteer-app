"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  type PasswordResetState,
} from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiLoader4Line } from "@remixicon/react";
import { EmailSentNotice } from "../_components/email-sent-notice";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<PasswordResetState, FormData>(
    requestPasswordReset,
    null
  );

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

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={pending}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <RiLoader4Line className="size-4 animate-spin" />
            Sending link...
          </>
        ) : (
          "Email me a reset link"
        )}
      </Button>
    </form>
  );
}
