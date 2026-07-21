import type { Metadata } from "next";
import { RiMailLine, RiPhoneLine } from "@remixicon/react";
import { InfoSection, InfoShell } from "../_components/info-page";

export const metadata: Metadata = {
  title: "Tautoko · Support | Te Pūaroha",
  description:
    "Help with the Te Pūaroha volunteer app - signing in, shifts, training, your details, and getting in touch with the Compassion Soup Kitchen team.",
};

const faqs = [
  {
    q: "I can't sign in",
    a: "Check that you're using the email address you volunteered with, or try the Google sign-in button if that's how you first joined. Forgotten your password? Use \"Forgot your password?\" on the sign-in page to reset it. Still stuck? Email or ring us and we'll get you back in.",
  },
  {
    q: "How do I pick up a shift?",
    a: "Open the Shifts tab, browse what's open (filter by service area if you like), and tap Book on the shift you want. It lands on your roster straight away, and you'll see it on your home screen too.",
  },
  {
    q: "I can't make a shift any more",
    a: "Life happens! Open the shift from your roster and cancel it - the earlier the better, so another volunteer can step in.",
  },
  {
    q: "How do I update my details?",
    a: "Go to Profile and tap Edit profile to update your phone, address or emergency contact. Keeping these current really helps the kitchen team.",
  },
  {
    q: "Why am I not getting reminders?",
    a: "Make sure notifications are switched on for the app in your phone's Settings. If they're on and you're still not hearing from us, get in touch.",
  },
  {
    q: "How do I delete my account?",
    a: "Email us at info@soupkitchen.org.nz from the address on your account and we'll close it and remove your personal information. We'd love to hear what we could have done better, too.",
  },
];

export default function SupportPage() {
  return (
    <InfoShell
      eyebrow="Tautoko · Support"
      title="We're here to help"
      lede="Questions about the app, your shifts, or your account? Kōrero mai - the kitchen team is always happy to hear from you."
    >
      <InfoSection title="Get in touch">
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:info@soupkitchen.org.nz"
            className="group rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border transition-shadow hover:shadow-md"
          >
            <RiMailLine className="size-5 text-primary" />
            <p className="mt-3 font-medium text-foreground">Email us</p>
            <p className="mt-1 text-sm text-muted-foreground transition-colors group-hover:text-primary">
              info@soupkitchen.org.nz
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Best for account questions - we usually reply within a couple of working days.
            </p>
          </a>
          <a
            href="tel:+6443892288"
            className="group rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border transition-shadow hover:shadow-md"
          >
            <RiPhoneLine className="size-5 text-primary" />
            <p className="mt-3 font-medium text-foreground">Ring the kitchen</p>
            <p className="mt-1 text-sm text-muted-foreground transition-colors group-hover:text-primary">
              (04) 389 2288
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Best for anything urgent, like a shift you can&apos;t make today.
            </p>
          </a>
        </div>
      </InfoSection>

      <InfoSection title="Common questions">
        <dl className="space-y-6">
          {faqs.map((f) => (
            <div key={f.q}>
              <dt className="font-medium text-foreground">{f.q}</dt>
              <dd className="mt-1.5">{f.a}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>

      <InfoSection title="New to Te Pūaroha?">
        <p>
          The app is for registered Compassion Soup Kitchen volunteers. If you&apos;d like to join
          the whānau, we&apos;d love to meet you -{" "}
          <a
            href="/register"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            start your application
          </a>{" "}
          and we&apos;ll take it from there.
        </p>
      </InfoSection>
    </InfoShell>
  );
}
