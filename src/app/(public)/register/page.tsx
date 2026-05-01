import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Nau mai — Join Us | Te Pūaroha",
  description:
    "Create your Compassion Soup Kitchen volunteer account and start making a difference in your community.",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image
              src="/favicon-192x192.png"
              alt="Te Pūaroha"
              width={40}
              height={40}
              className="size-10"
              priority
            />
            <span className="text-lg font-semibold tracking-tight">
              Te Pūaroha
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              Nau mai — Join our whānau
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Create your volunteer account to get started
            </p>
          </div>

          <RegisterForm />
        </div>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
