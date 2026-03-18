import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { RiHeartLine } from "@remixicon/react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kia ora — Sign In | Te Pūaroha",
  description:
    "Sign in to your Compassion Soup Kitchen volunteer account to manage shifts and connect with whānau.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center bg-primary">
              <RiHeartLine className="size-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Te Pūaroha
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              Kia ora — Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to your volunteer account
            </p>
          </div>

          <LoginForm />
        </div>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Te Pūaroha?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
