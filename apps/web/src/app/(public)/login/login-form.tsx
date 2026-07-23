"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { RiShieldKeyholeLine, RiUserLine, RiHeartLine } from "@remixicon/react";
import { demoLogin, login, type AuthState } from "@/lib/auth-actions";
import type { DemoRole } from "@/lib/demo-accounts";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RiGoogleFill, RiLoader4Line } from "@remixicon/react";
import { FormAlert } from "../_components/form-alert";
import { ResendVerificationForm } from "../_components/resend-verification-form";

/**
 * Labels only. The credentials live server-side in `demoLogin` so they never
 * reach the client bundle - a client component can't be tree-shaken by a
 * runtime flag, so anything referenced here ships in every build.
 */
const DEMO_ACCOUNTS: { role: DemoRole; label: string; icon: typeof RiUserLine }[] = [
  { role: "admin", label: "Admin", icon: RiShieldKeyholeLine },
  { role: "coordinator", label: "Coordinator", icon: RiUserLine },
  { role: "volunteer", label: "Volunteer", icon: RiHeartLine },
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
  // Driven through useActionState, like the sign-in form above it, so Next
  // handles the post-sign-in redirect the same way.
  const [demoState, demoAction, demoPending] = useActionState<
    AuthState,
    FormData
  >(demoLogin, null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const busy = pending || demoPending;
  const alert = state?.error ?? demoState?.error;

  return (
    <>
      {showDemoAccounts && (
        <div className="mb-6 rounded-xl bg-secondary/60 p-4 ring-1 ring-border">
          <p className="eyebrow mb-2.5 text-muted-foreground">
            Demo accounts
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <form key={account.role} action={demoAction}>
                {/* Only the role travels to the server; it looks up the password. */}
                <input type="hidden" name="role" value={account.role} />
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition-colors hover:bg-primary-tint hover:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
                >
                  <account.icon className="size-3.5 text-muted-foreground" />
                  {account.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      <form action={action} className="space-y-4">
        {alert && <FormAlert>{alert}</FormAlert>}

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
            disabled={busy}
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
            disabled={busy}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
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
