"use client";

import { useActionState } from "react";
import { register, type RegisterState } from "@/lib/auth-actions";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RiGoogleFill, RiLoader4Line } from "@remixicon/react";
import { EmailSentNotice } from "../_components/email-sent-notice";
import { FormAlert } from "@/components/form-alert";
import { ResendVerificationForm } from "../_components/resend-verification-form";

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(
    register,
    null
  );

  if (state?.verificationSentTo) {
    return (
      <div className="space-y-4">
        <EmailSentNotice
          message={
            <>
              We&apos;ve sent a verification link to{" "}
              <span className="font-medium text-foreground">
                {state.verificationSentTo}
              </span>
              . Click it to activate your account - it&apos;s valid for 24
              hours.
            </>
          }
        />
        <ResendVerificationForm email={state.verificationSentTo} />
      </div>
    );
  }

  return (
    <>
      <form action={action} className="space-y-4">
        {state?.error && <FormAlert>{state.error}</FormAlert>}

        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            required
            disabled={pending}
          />
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            required
            minLength={8}
            disabled={pending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <RiLoader4Line className="size-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
          or sign up with
        </span>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => signIn("google", { redirectTo: "/dashboard" })}
        type="button"
      >
        <RiGoogleFill className="size-4" />
        Google
      </Button>
    </>
  );
}
