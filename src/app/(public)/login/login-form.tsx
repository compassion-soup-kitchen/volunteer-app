"use client";

import { useActionState, useRef } from "react";
import { RiShieldKeyholeLine, RiUserLine } from "@remixicon/react";
import { login, type AuthState } from "@/lib/auth-actions";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RiGoogleFill, RiLoader4Line } from "@remixicon/react";

const DEV_ACCOUNTS = [
  { label: "Admin", email: "admin@soupkitchen.org.nz", password: "admin123!", icon: RiShieldKeyholeLine },
  { label: "Coordinator", email: "coordinator@soupkitchen.org.nz", password: "coord123!", icon: RiUserLine },
];

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    login,
    null
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function fillCredentials(email: string, password: string) {
    if (emailRef.current) emailRef.current.value = email;
    if (passwordRef.current) passwordRef.current.value = password;
  }

  return (
    <>
      {process.env.NODE_ENV !== "production" && (
        <div className="mb-4 rounded-md border border-dashed border-muted-foreground/30 bg-muted/50 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Dev accounts (click to fill)
          </p>
          <div className="flex gap-2">
            {DEV_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillCredentials(account.email, account.password)}
                className="flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition-colors hover:bg-accent"
              >
                <account.icon className="size-3.5 text-muted-foreground" />
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
          <Label htmlFor="password">Password</Label>
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
