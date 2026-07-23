import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";
import { demoLoginsEnabled } from "@/lib/demo-accounts";

export const metadata: Metadata = {
  title: "Kia ora — Sign In | Te Pūaroha",
  description:
    "Sign in to your Compassion Soup Kitchen volunteer account to manage shifts and connect with whānau.",
};

export default async function LoginPage() {
  // Rendered per-request so DEMO_LOGINS is read from the runtime environment -
  // a production build deployed to staging can still enable the demo accounts.
  await connection();
  const showDemoAccounts = demoLoginsEnabled();

  return (
    <AuthShell
      eyebrow="Kia ora · Welcome back"
      title="Sign in to your account"
      subtitle="Manage your shifts, hours and whānau."
      footer={
        <>
          New to Te Pūaroha?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm showDemoAccounts={showDemoAccounts} />
    </AuthShell>
  );
}
