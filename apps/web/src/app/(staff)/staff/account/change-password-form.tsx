"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RiCheckboxCircleLine, RiLockLine, RiLoader4Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/form-alert";
import { PasswordInput } from "@/components/password-input";
import {
  changeMyPassword,
  type PasswordChangeState,
} from "@/lib/account-actions";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/account-schema";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<PasswordChangeState, FormData>(
    changeMyPassword,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const cleared = useRef<string | null>(null);

  // Never leave a used password sitting in the DOM.
  useEffect(() => {
    if (!state?.success || cleared.current === state.success) return;
    cleared.current = state.success;
    formRef.current?.reset();
    toast.success("Password updated");
  }, [state?.success]);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      {state?.error && <FormAlert>{state.error}</FormAlert>}

      {state?.success && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-md bg-success-tint px-3 py-2.5 text-sm text-success-tint-foreground"
        >
          <RiCheckboxCircleLine className="mt-0.5 size-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          required
          disabled={pending}
          aria-invalid={state?.error ? true : undefined}
        />
      </div>

      <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN}
            maxLength={PASSWORD_MAX}
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            {`At least ${PASSWORD_MIN} characters. A short phrase you'll remember beats a scramble you won't.`}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN}
            maxLength={PASSWORD_MAX}
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-xs text-muted-foreground">
          We&apos;ll email you whenever this password changes.
        </p>
        <Button type="submit" disabled={pending} className="gap-1.5">
          {pending ? (
            <>
              <RiLoader4Line className="size-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RiLockLine className="size-4" />
              Update password
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
