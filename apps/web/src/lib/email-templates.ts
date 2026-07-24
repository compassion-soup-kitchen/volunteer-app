/**
 * Every transactional email the app sends, as pure template functions
 * returning subject + branded content.
 *
 * Keeping them together here means the styleguide's email preview page
 * (/styleguide/emails) always renders exactly what production sends, and
 * copy lives in one place instead of being scattered through the actions.
 */

import type { BrandedEmail } from "@/lib/email";

export type EmailTemplate = {
  subject: string;
  content: BrandedEmail;
};

export type ApplicationDecision = "APPROVED" | "DECLINED" | "INFO_REQUESTED";

/** Sent right after sign-up; the link redeems at /verify-email. */
export function verificationEmail(
  name: string | null,
  verifyUrl: string
): EmailTemplate {
  return {
    subject: "Confirm your email for Te Pūaroha",
    content: {
      preview: "One quick click and your account is ready to go",
      heading: "Confirm your email address",
      paragraphs: [
        name ? `Kia ora ${name},` : "Kia ora,",
        "Nau mai, haere mai - welcome to Te Pūaroha. Please confirm this email address so we know it's really you, then you're all set to sign in.",
        "The link is valid for 24 hours and can only be used once.",
      ],
      cta: { label: "Confirm my email", url: verifyUrl },
      footerNote:
        "If you didn't create a Te Pūaroha account, you can safely ignore this email.",
    },
  };
}

/** Sent from the forgot-password form; the link redeems at /reset-password. */
export function passwordResetEmail(
  name: string | null,
  resetUrl: string
): EmailTemplate {
  return {
    subject: "Reset your Te Pūaroha password",
    content: {
      preview: "Choose a new password for your Te Pūaroha account",
      heading: "Reset your password",
      paragraphs: [
        name ? `Kia ora ${name},` : "Kia ora,",
        "We received a request to reset the password for your Te Pūaroha volunteer account. Tap the button below to choose a new one.",
        "The link is valid for 60 minutes and can only be used once.",
      ],
      cta: { label: "Choose a new password", url: resetUrl },
      footerNote:
        "If you didn't ask for this, you can safely ignore this email - your password won't change.",
    },
  };
}

/**
 * Sent after someone changes their own password from the account page. This
 * is the safety net: if the change wasn't theirs, this email is how they find
 * out while the reset link can still rescue the account.
 */
export function passwordChangedEmail(
  name: string | null,
  resetUrl: string
): EmailTemplate {
  return {
    subject: "Your Te Pūaroha password was changed",
    content: {
      preview: "A heads-up that your account password just changed",
      heading: "Your password was changed",
      paragraphs: [
        name ? `Kia ora ${name},` : "Kia ora,",
        "This is just a note to let you know the password on your Te Pūaroha account was changed a moment ago. If that was you, there's nothing more to do.",
        "If it wasn't you, reset your password straight away and let a coordinator know.",
      ],
      cta: { label: "Reset my password", url: resetUrl },
      footerNote:
        "We send this every time a password changes, so you always know where your account stands.",
    },
  };
}

/** Confirmation sent as soon as a volunteer application is submitted. */
export function applicationReceivedEmail(
  name: string | null,
  applicationUrl: string
): EmailTemplate {
  return {
    subject: "Your volunteer application has arrived - Te Pūaroha",
    content: {
      heading: "We've received your application",
      preview: "Thank you for offering your time to Te Pūaroha.",
      paragraphs: [
        `Kia ora${name ? ` ${name}` : ""},`,
        "Thank you for applying to volunteer with Compassion Soup Kitchen. Your application is with our coordinator team now, and we'll be in touch once we've had a look - usually within a week or two.",
        "You can check how things are going from your dashboard any time.",
      ],
      cta: { label: "View your application", url: applicationUrl },
    },
  };
}

/** Outcome email when staff review an application. */
export function applicationDecisionEmail(
  firstName: string | null,
  decision: ApplicationDecision,
  baseUrl: string
): EmailTemplate {
  const greeting = `Kia ora${firstName ? ` ${firstName}` : ""},`;

  if (decision === "APPROVED") {
    return {
      subject: "You're in! Your volunteer application is approved - Te Pūaroha",
      content: {
        heading: "Nau mai, haere mai - you're approved!",
        preview: "Your volunteer application has been approved.",
        paragraphs: [
          greeting,
          "Wonderful news - your application to volunteer with Compassion Soup Kitchen has been approved. We're so glad you're joining the whānau.",
          "Next step is your induction. Sign in to your dashboard to see what's coming up and grab your first shift when you're ready.",
        ],
        cta: { label: "Open your dashboard", url: `${baseUrl}/dashboard` },
      },
    };
  }

  if (decision === "INFO_REQUESTED") {
    return {
      subject: "We need a few more details - Te Pūaroha",
      content: {
        heading: "A quick follow-up on your application",
        preview: "We need one or two more details from you.",
        paragraphs: [
          greeting,
          "Thanks so much for your application. Before we can take the next step, our coordinators need a little more information from you.",
          "The details are waiting on your application page - it'll only take a moment.",
        ],
        cta: { label: "View your application", url: `${baseUrl}/application` },
      },
    };
  }

  return {
    subject: "An update on your volunteer application - Te Pūaroha",
    content: {
      heading: "About your volunteer application",
      preview: "An update on your application to Te Pūaroha.",
      paragraphs: [
        greeting,
        "Thank you for offering your time to Compassion Soup Kitchen - that means a great deal to us.",
        "After careful consideration we're not able to offer you a volunteer role right now. If circumstances change, or you'd like to talk it through, we'd love to hear from you - just reply to this email or get in touch with the kitchen.",
      ],
    },
  };
}
