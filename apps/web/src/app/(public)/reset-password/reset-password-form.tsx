"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type PasswordResetState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiLoader4Line,
} from "@remixicon/react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<PasswordResetState, FormData>(
    resetPassword,
    null
  );

  if (!token) {
    return (
      <div className="rounded-2xl border border-border bg-secondary/60 p-5">
        <div className="flex items-start gap-3">
          <RiErrorWarningLine className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">
              This link doesn&apos;t look quite right
            </p>
            <p className="leading-relaxed text-muted-foreground">
              The reset link is missing its token — it may have been trimmed by
              your email app. Request a fresh one and we&apos;ll email it right
              over.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block font-medium text-primary underline-offset-4 hover:underline"
            >
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-secondary/60 p-5">
          <div className="flex items-start gap-3">
            <RiCheckboxCircleLine className="mt-0.5 size-5 shrink-0 text-success" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">Ka pai, all sorted</p>
              <p className="leading-relaxed text-muted-foreground">
                {state.success}
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
    <form action={action} className="space-y-4">
      {state?.error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          minLength={8}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your new password"
          required
          minLength={8}
          disabled={pending}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <RiLoader4Line className="size-4 animate-spin" />
            Resetting...
          </>
        ) : (
          "Reset password"
        )}
      </Button>
    </form>
  );
}
