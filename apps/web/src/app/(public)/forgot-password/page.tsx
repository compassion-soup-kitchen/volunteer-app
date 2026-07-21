import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password | Te Pūaroha",
  description:
    "Request a password reset link for your Compassion Soup Kitchen volunteer account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Kia ora · It happens"
      title="Forgot your password?"
      subtitle="No worries — tell us your email and we'll send you a link to choose a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
