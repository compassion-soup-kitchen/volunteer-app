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
import { FormAlert } from "@/components/form-alert";

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
      {state?.error && <FormAlert>{state.error}</FormAlert>}

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
