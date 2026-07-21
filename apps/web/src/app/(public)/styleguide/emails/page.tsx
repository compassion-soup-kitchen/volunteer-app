import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Eyebrow } from "@/components/brand/eyebrow";
import { ThemeToggle } from "@/components/theme-toggle";
import { RiArrowLeftLine } from "@remixicon/react";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  getBaseUrl,
} from "@/lib/email";
import {
  applicationDecisionEmail,
  applicationReceivedEmail,
  passwordResetEmail,
  verificationEmail,
  type EmailTemplate,
} from "@/lib/email-templates";

export const metadata: Metadata = {
  title: "Email Previews | Te Pūaroha",
  description:
    "Live previews of every transactional email the volunteer app sends.",
};

type EmailSample = {
  slug: string;
  title: string;
  note: string;
  template: EmailTemplate;
};

/**
 * Rendered straight from the production templates in
 * `src/lib/email-templates.ts` with sample data, so what you see here is
 * exactly what lands in an inbox.
 */
function getSamples(): EmailSample[] {
  const base = getBaseUrl();
  const sampleName = "Aroha Williams";
  const sampleFirstName = "Aroha";
  const sampleToken = "sample-token";

  return [
    {
      slug: "verification",
      title: "Email verification",
      note: "Sent right after sign-up. The link redeems at /verify-email.",
      template: verificationEmail(
        sampleName,
        `${base}/verify-email?token=${sampleToken}`
      ),
    },
    {
      slug: "password-reset",
      title: "Password reset",
      note: "Sent from the forgot-password form. The link redeems at /reset-password.",
      template: passwordResetEmail(
        sampleName,
        `${base}/reset-password?token=${sampleToken}`
      ),
    },
    {
      slug: "application-received",
      title: "Application received",
      note: "Confirmation sent as soon as a volunteer application is submitted.",
      template: applicationReceivedEmail(sampleName, `${base}/application`),
    },
    {
      slug: "application-approved",
      title: "Application approved",
      note: "Decision email when staff approve an application.",
      template: applicationDecisionEmail(sampleFirstName, "APPROVED", base),
    },
    {
      slug: "application-info-requested",
      title: "Application follow-up",
      note: "Decision email when staff need more details from the applicant.",
      template: applicationDecisionEmail(sampleFirstName, "INFO_REQUESTED", base),
    },
    {
      slug: "application-declined",
      title: "Application declined",
      note: "Decision email when staff decline an application.",
      template: applicationDecisionEmail(sampleFirstName, "DECLINED", base),
    },
  ];
}

export default function EmailPreviewsPage() {
  const samples = getSamples();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Wordmark className="h-6" />
          <div className="flex items-center gap-3">
            <Eyebrow className="hidden sm:block">Email previews</Eyebrow>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/styleguide"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <RiArrowLeftLine className="size-4" />
          Back to styleguide
        </Link>

        <h1 className="mt-6 font-serif text-4xl font-light tracking-tight">
          Every email we send
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          Rendered live from the production templates with sample data - what
          you see here is exactly what lands in a volunteer&apos;s inbox.
          Emails keep their own inline-styled warm palette in both app themes,
          because inboxes have no dark mode tokens.
        </p>

        <div className="mt-12 space-y-16">
          {samples.map(({ slug, title, note, template }) => (
            <section key={slug} id={slug}>
              <Eyebrow>{title}</Eyebrow>
              <hr className="mt-4 h-0.5 w-16 rounded-full border-0 bg-primary" />
              <p className="mt-4 text-sm text-muted-foreground">{note}</p>
              <p className="mt-3 text-sm">
                <span className="font-medium uppercase tracking-[0.12em] text-xs text-muted-foreground">
                  Subject
                </span>{" "}
                <span className="ml-2 font-medium">{template.subject}</span>
              </p>
              <iframe
                title={`${title} email preview`}
                sandbox=""
                srcDoc={buildBrandedEmailHtml(template.content)}
                className="mt-5 h-[640px] w-full rounded-2xl border border-border bg-[#f6f1e9]"
              />
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                  Plain-text version
                </summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-border bg-secondary/60 p-5 font-mono text-xs leading-relaxed text-foreground">
                  {buildBrandedEmailText(template.content)}
                </pre>
              </details>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
