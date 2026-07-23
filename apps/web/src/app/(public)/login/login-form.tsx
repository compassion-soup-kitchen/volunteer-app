"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { RiShieldKeyholeLine, RiUserLine, RiHeartLine } from "@remixicon/react";
import { login, type AuthState } from "@/lib/auth-actions";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RiGoogleFill, RiLoader4Line } from "@remixicon/react";
import { FormAlert } from "../_components/form-alert";
import { ResendVerificationForm } from "../_components/resend-verification-form";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@soupkitchen.org.nz", password: "admin123!", icon: RiShieldKeyholeLine },
  { label: "Coordinator", email: "coordinator@soupkitchen.org.nz", password: "coord123!", icon: RiUserLine },
  { label: "Volunteer", email: "volunteer@soupkitchen.org.nz", password: "volunteer123!", icon: RiHeartLine },
];

export function LoginForm({
  showDemoAccounts = false,
}: {
  /** Renders one-click sign-in chips for the seeded demo accounts. Only ever
   *  true outside production (see login/page.tsx). */
  showDemoAccounts?: boolean;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    login,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function signInAs(email: string, password: string) {
    if (!emailRef.current || !passwordRef.current) return;
    emailRef.current.value = email;
    passwordRef.current.value = password;
    formRef.current?.requestSubmit();
  }

  return (
    <>
      {showDemoAccounts && (
        <div className="mb-6 rounded-xl bg-secondary/60 p-4 ring-1 ring-border">
          <p className="eyebrow mb-2.5 text-muted-foreground">
            Demo accounts
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={pending}
                onClick={() => signInAs(account.email, account.password)}
                className="flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition-colors hover:bg-primary-tint hover:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
              >
                <account.icon className="size-3.5 text-muted-foreground" />
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form ref={formRef} action={action} className="space-y-4">
        {state?.error && <FormAlert>{state.error}</FormAlert>}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            ref={emailRef}
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            disabled={pending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <RiLoader4Line className="size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      {state?.unverifiedEmail && (
        <div className="mt-4">
          <ResendVerificationForm email={state.unverifiedEmail} />
        </div>
      )}

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
          or continue with
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
