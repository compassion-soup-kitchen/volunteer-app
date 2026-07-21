import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { VerifyEmailStatus } from "./verify-email-status";

export const metadata: Metadata = {
  title: "Confirm Email | Te Pūaroha",
  description:
    "Confirm the email address for your Compassion Soup Kitchen volunteer account.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      eyebrow="Kia ora · One last step"
      title="Confirm your email"
      subtitle="We just need to make sure this address is really yours."
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
      <VerifyEmailStatus token={token ?? ""} />
    </AuthShell>
  );
}
