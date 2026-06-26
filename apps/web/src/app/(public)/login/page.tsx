import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Kia ora — Sign In | Te Pūaroha",
  description:
    "Sign in to your Compassion Soup Kitchen volunteer account to manage shifts and connect with whānau.",
};

export default function LoginPage() {
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
      <LoginForm />
    </AuthShell>
  );
}
