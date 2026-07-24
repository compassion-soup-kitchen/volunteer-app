"use client";

import { useActionState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  RiCheckLine,
  RiInformationLine,
  RiLoader4Line,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateAccountDetails,
  type AccountDetailsState,
} from "@/lib/account-actions";
import { ACCOUNT_NAME_MAX } from "@/lib/account-schema";
import { FormAlert } from "@/components/form-alert";

export function AccountDetailsForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<AccountDetailsState, FormData>(
    updateAccountDetails,
    null
  );
  const { update } = useSession();
  const router = useRouter();
  const announced = useRef<string | null>(null);

  // The name lives in the JWT, which is what the sidebar reads — refresh the
  // session so the new name lands in the chrome without a sign-out. The
  // argument matters: `update()` with no payload is a plain session fetch, and
  // only a payload makes next-auth re-run the jwt callback with
  // `trigger: "update"`. The value itself is ignored there — the callback
  // re-reads the name from the database rather than trusting the client.
  useEffect(() => {
    if (!state?.savedName || announced.current === state.savedName) return;
    announced.current = state.savedName;
    toast.success("Your details have been saved");
    void update({ name: state.savedName }).then(() => router.refresh());
  }, [state?.savedName, update, router]);

  return (
    <form action={action} className="space-y-5">
      {state?.error && <FormAlert>{state.error}</FormAlert>}

      <div className="space-y-2">
        <Label htmlFor="account-name">Full name</Label>
        <Input
          id="account-name"
          name="name"
          defaultValue={name}
          autoComplete="name"
          required
          maxLength={ACCOUNT_NAME_MAX}
          disabled={pending}
          aria-invalid={state?.error ? true : undefined}
        />
        <p className="text-xs text-muted-foreground">
          This is the name volunteers see on shifts, pānui, and application
          decisions you make.
        </p>
      </div>

      {/* Read-only, and said plainly rather than shown as a dead input. */}
      <div className="flex items-start gap-2.5 rounded-md bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <RiInformationLine className="mt-0.5 size-4 shrink-0" />
        <p>
          You sign in with <span className="font-medium">{email}</span>. Your
          email address and your role are both set by an administrator, so they
          can&apos;t be edited here.
        </p>
      </div>

      <div className="flex justify-end border-t border-border pt-5">
        <Button type="submit" disabled={pending} className="gap-1.5">
          {pending ? (
            <>
              <RiLoader4Line className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <RiCheckLine className="size-4" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
