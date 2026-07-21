/*
 * ============================================================================
 * DRAFT — FOR REVIEW BY COMPASSION SOUP KITCHEN BEFORE LAUNCH
 *
 * This privacy statement was drafted for the organisation to review, correct
 * and approve before the app goes live. Items marked "TO CONFIRM" in comments
 * below need a decision from the kitchen:
 *   - the privacy contact channel (dedicated privacy@ address vs the kitchen's
 *     general email)
 *   - exact retention periods for applications and volunteer records
 * ============================================================================
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Eyebrow } from "@/components/brand/eyebrow";
import { SectionHeading } from "@/components/brand/section-heading";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = {
  title: "Privacy Statement | Te Pūaroha",
  description:
    "How Compassion Soup Kitchen (Te Pūaroha) collects, uses, and looks after volunteers' personal information under the NZ Privacy Act 2020.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl font-light tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed text-muted-foreground">{children}</p>;
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 leading-relaxed text-muted-foreground">
          <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-primary/60" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Slim header — the landing nav's anchor links don't apply here */}
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label="Te Pūaroha home" className="shrink-0">
            <Wordmark className="h-6 sm:h-7" />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <SectionHeading
          as="h1"
          size="lg"
          eyebrow="Matatapu · Privacy"
          className="max-w-xl"
        >
          How we look after your information
        </SectionHeading>
        <p className="mt-5 text-sm text-muted-foreground">
          Last updated July 2026 · Compassion Soup Kitchen · Te Pūaroha
        </p>

        <div className="mt-8 space-y-4">
          <P>
            When you volunteer with us, you trust us with some of your personal
            information. We take that trust seriously. This statement explains,
            in plain English, what we collect through the Te Pūaroha volunteer
            app, why we collect it, who can see it, and the rights you have
            under the New Zealand Privacy Act 2020.
          </P>
        </div>

        {/* The short version — a warm, scannable summary card */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <Eyebrow className="text-primary">Te whakarāpopoto · The short version</Eyebrow>
          <div className="mt-4">
            <List
              items={[
                "We only collect what we need to run the volunteer programme safely and well.",
                "Only the kitchen's coordinators and administrators can see your details.",
                "We never sell your information, and we never use it for advertising.",
                "Your information lives on the organisation's own infrastructure, not a third-party marketing platform.",
                "You can ask to see what we hold about you, and ask us to correct it, at any time.",
              ]}
            />
          </div>
        </div>

        <div className="mt-14 space-y-12">
          <Section title="Who we are">
            <P>
              Compassion Soup Kitchen — Te Pūaroha — is a registered charity
              (CC 10246) that has served the Wellington community since 1901.
              The volunteer app is how our whānau of volunteers applies, signs
              up for shifts, completes training, and stays connected with the
              kitchen. This statement covers the information handled by that
              app.
            </P>
          </Section>

          <Section title="What we collect">
            <P>We collect information at a few points along your volunteering journey:</P>
            <List
              items={[
                <>
                  <strong className="font-medium text-foreground">Your account.</strong>{" "}
                  Your name and email address, and a password if you create one
                  (we store it securely hashed — we can never read it). If you
                  sign in with Google, we receive your name and email address
                  from Google, and nothing more.
                </>,
                <>
                  <strong className="font-medium text-foreground">Your application.</strong>{" "}
                  The details you give us when you apply to volunteer: your date
                  of birth, address, phone number, emergency contact, your
                  availability, and anything you choose to tell us about
                  yourself.
                </>,
                <>
                  <strong className="font-medium text-foreground">Police vetting status.</strong>{" "}
                  Because our volunteers work alongside people who may be
                  vulnerable, volunteering involves Ministry of Justice vetting.
                  We record only the status of your vetting — for example
                  submitted or cleared — not the underlying records.
                </>,
                <>
                  <strong className="font-medium text-foreground">Your mahi.</strong>{" "}
                  The shifts you sign up for and attend, the hours you give, and
                  the training you complete.
                </>,
                <>
                  <strong className="font-medium text-foreground">Documents and agreements.</strong>{" "}
                  Agreements you sign in the app (including your drawn
                  signature) and any documents uploaded as part of your
                  volunteer record.
                </>,
                <>
                  <strong className="font-medium text-foreground">Keeping you signed in.</strong>{" "}
                  A session cookie so you stay signed in, and your light/dark
                  theme preference. We don&apos;t use advertising or tracking
                  cookies.
                </>,
              ]}
            />
          </Section>

          <Section title="Why we collect it">
            <P>Everything we collect has a practical purpose:</P>
            <List
              items={[
                "To run the volunteer programme — reviewing applications, rostering shifts, and recording training.",
                "To keep everyone safe — police vetting, and knowing who to call if something happens while you're on shift.",
                "To recognise your contribution — tracking the hours and aroha you give.",
                "To stay in touch — announcements, shift reminders, and updates from the kitchen.",
                "To meet our legal obligations as a charity working with vulnerable people.",
              ]}
            />
            <P>
              We won&apos;t use your information for anything unrelated to
              volunteering without asking you first.
            </P>
          </Section>

          <Section title="Who can see it">
            <P>
              Access is deliberately narrow. Only the kitchen&apos;s
              coordinators and administrators can see volunteer records, and
              they see them because managing the programme is their job. Other
              volunteers cannot see your personal details.
            </P>
            <P>
              We don&apos;t sell your information or share it with third
              parties for their own purposes. The only outside parties involved
              are the Ministry of Justice (for vetting, with your consent as
              part of your application) and the essential services that make the
              app run, such as email delivery. We would only disclose your
              information beyond that where the law requires it.
            </P>
          </Section>

          <Section title="Where it lives">
            <P>
              Your information is stored on the organisation&apos;s own
              self-hosted infrastructure — not scattered across third-party
              marketing or analytics platforms. Access is restricted to
              authorised staff accounts, passwords are stored hashed, and
              uploaded documents are held in private storage that isn&apos;t
              publicly accessible.
            </P>
          </Section>

          {/* TO CONFIRM: exact retention periods (e.g. how long after a
              declined application or after a volunteer becomes inactive
              records are kept) — the org should set these before launch. */}
          <Section title="How long we keep it">
            <P>
              We keep your information while you&apos;re volunteering with us,
              and for a reasonable period afterwards so we can meet our legal
              obligations and welcome you back easily if you return. When your
              information is no longer needed, we securely delete or anonymise
              it. If you&apos;d like your record removed sooner, just ask.
            </P>
          </Section>

          <Section title="Your rights">
            <P>
              Under the Privacy Act 2020 you have the right to ask us for a
              copy of the personal information we hold about you, and to ask us
              to correct anything that&apos;s wrong. You can see and update
              most of your details yourself on your profile in the app — and
              for anything else, just ask and we&apos;ll help.
            </P>
            <P>
              If you&apos;re ever unhappy with how we&apos;ve handled your
              information and we can&apos;t put it right, you can complain to
              the Office of the Privacy Commissioner at{" "}
              <a
                href="https://www.privacy.org.nz"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
              >
                privacy.org.nz
              </a>
              .
            </P>
          </Section>

          {/* TO CONFIRM: privacy contact channel. A dedicated address
              (e.g. privacy@soupkitchen.org.nz) would be ideal; until then the
              page points people at the coordinator team and the kitchen's
              general email so it reads complete. */}
          <Section title="Questions?">
            <P>
              Kōrero mai — talk to us. If you have any questions about your
              information, or want to see or correct what we hold, contact the
              coordinator team at the kitchen or email{" "}
              <a
                href="mailto:info@soupkitchen.org.nz"
                className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
              >
                info@soupkitchen.org.nz
              </a>
              . We&apos;ll get back to you as quickly as we can.
            </P>
          </Section>

          <Section title="Changes to this statement">
            <P>
              If how we handle your information changes, we&apos;ll update this
              page and let volunteers know through the app. The date at the top
              always shows when it was last revised.
            </P>
          </Section>
        </div>

        <Separator className="mt-16" />
        <footer className="flex flex-col items-center justify-between gap-3 py-8 text-xs text-muted-foreground sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} Compassion Soup Kitchen · Te Pūaroha
          </p>
          <Link href="/" className="transition-colors hover:text-primary">
            Back to the homepage
          </Link>
        </footer>
      </main>
    </div>
  );
}
