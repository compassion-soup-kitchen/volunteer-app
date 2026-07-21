import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password | Te Pūaroha",
  description:
    "Choose a new password for your Compassion Soup Kitchen volunteer account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      eyebrow="Kia ora · Almost there"
      title="Choose a new password"
      subtitle="Pick something at least 8 characters long that only you would know."
      footer={
        <>
          Back to{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <ResetPasswordForm token={token ?? ""} />
    </AuthShell>
  );
}
