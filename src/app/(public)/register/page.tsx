import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Nau mai — Join Us | Te Pūaroha",
  description:
    "Create your Compassion Soup Kitchen volunteer account and start making a difference in your community.",
};

export default function RegisterPage() {
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
      <RegisterForm />
    </AuthShell>
  );
}
