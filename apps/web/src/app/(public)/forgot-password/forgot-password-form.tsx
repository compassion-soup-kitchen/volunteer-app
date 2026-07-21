"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  type PasswordResetState,
} from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiLoader4Line, RiMailSendLine } from "@remixicon/react";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<PasswordResetState, FormData>(
    requestPasswordReset,
    null
  );

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-border bg-secondary/60 p-5">
        <div className="flex items-start gap-3">
          <RiMailSendLine className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Check your inbox</p>
            <p className="leading-relaxed text-muted-foreground">
              {state.success}
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Nothing after a few minutes? Have a look in your spam folder.
            </p>
          </div>
        </div>
      </div>
    );
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
