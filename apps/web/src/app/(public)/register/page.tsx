import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { connection } from "next/server";
import { RegisterForm } from "./register-form";
import { readAppleWebCredentials } from "@/lib/apple-api";

export const metadata: Metadata = {
  title: "Nau mai · Join us | Te Pūaroha",
  description:
    "Create your Compassion Soup Kitchen volunteer account and start making a difference in your community.",
};

export default async function RegisterPage() {
  // Per request, so the Apple button follows the runtime environment rather
  // than whatever was set when the image was built.
  await connection();
  const appleEnabled = readAppleWebCredentials() !== null;

  return (
    <AuthShell
      eyebrow="Nau mai · Join our whānau"
      title="Create your account"
      subtitle="A few details and you're ready to give back."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm appleEnabled={appleEnabled} />
    </AuthShell>
  );
}
