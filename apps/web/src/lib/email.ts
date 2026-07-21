/**
 * Transactional email via the Resend HTTP API (plain fetch, no SDK).
 *
 * Configuration comes from two env vars:
 * - `RESEND_API_KEY` — Resend API key
 * - `EMAIL_FROM` — sender, e.g. `Te Pūaroha <noreply@soupkitchen.org.nz>`
 *
 * When either is missing the module logs a single warning and no-ops so the
 * app keeps working without email. Sending never throws into caller flows —
 * a failed email must not break the mutation that triggered it.
 *
 * Emails are simple branded HTML with inline styles and no external assets.
 * Email clients never load our stylesheet, so the "theme tokens only" rule
 * cannot apply here — colors are inlined literally (brand red #DC0831 on
 * warm cream, matching the app's palette).
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * True when both Resend env vars are present, i.e. `sendEmail` will actually
 * send rather than skip. Flows that *depend* on an email arriving (account
 * verification) check this up front so they can degrade gracefully instead of
 * dead-ending the person on a "check your inbox" screen with no email coming.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Absolute origin for links inside emails, from NEXTAUTH_URL (no trailing slash). */
export function getBaseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: boolean };

let warnedUnconfigured = false;

/**
 * Sends an email through Resend. Returns `{ ok: false, skipped: true }` when
 * email is not configured, `{ ok: false, skipped: false }` when Resend
 * rejects or the network fails. Never throws.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn(
        "Email is not configured (set RESEND_API_KEY and EMAIL_FROM) — outgoing email will be skipped."
      );
    }
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Resend request failed (${res.status}): ${detail}`);
      return { ok: false, skipped: false };
    }

    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    console.error("Resend request error:", error);
    return { ok: false, skipped: false };
  }
}

/** Content for a simple branded Te Pūaroha email. */
export type BrandedEmail = {
  /** Inbox preview line; rendered invisibly at the top of the HTML body. */
  preview?: string;
  heading: string;
  /** Plain-text paragraphs — HTML-escaped automatically. */
  paragraphs: string[];
  cta?: { label: string; url: string };
  /** Small print under the body, e.g. "you can safely ignore this email". */
  footerNote?: string;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Renders a warm, self-contained HTML email — inline styles only. */
export function buildBrandedEmailHtml(email: BrandedEmail): string {
  const preview = email.preview
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(email.preview)}</div>`
    : "";

  const paragraphs = email.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#4a403a;">${escapeHtml(p)}</p>`
    )
    .join("");

  const cta = email.cta
    ? `<p style="margin:8px 0 18px;">
        <a href="${escapeHtml(email.cta.url)}" style="display:inline-block;background-color:#DC0831;color:#ffffff;border-radius:999px;padding:12px 26px;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(email.cta.label)}</a>
      </p>
      <p style="margin:0 0 18px;font-size:12px;line-height:1.5;color:#8a7d74;word-break:break-all;">If the button doesn't work, copy and paste this link into your browser:<br />${escapeHtml(email.cta.url)}</p>`
    : "";

  const footerNote = email.footerNote
    ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#8a7d74;">${escapeHtml(email.footerNote)}</p>`
    : "";

  return `${preview}<div style="margin:0;padding:32px 16px;background-color:#f6f1e9;font-family:${FONT_STACK};">
  <div style="max-width:560px;margin:0 auto;">
    <div style="text-align:center;padding-bottom:22px;">
      <span style="font-size:22px;font-weight:600;letter-spacing:-0.02em;color:#241d1a;">Te Pūaroha</span><br />
      <span style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a7d74;">Compassion Soup Kitchen</span>
    </div>
    <div style="background-color:#ffffff;border:1px solid #e9e0d4;border-radius:16px;padding:32px 28px;">
      <div style="height:3px;width:44px;background-color:#DC0831;border-radius:2px;margin-bottom:20px;"></div>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;letter-spacing:-0.01em;color:#241d1a;">${escapeHtml(email.heading)}</h1>
      ${paragraphs}
      ${cta}
      ${footerNote}
      <p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#4a403a;">Aroha nui,<br />The Te Pūaroha team</p>
    </div>
    <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#8a7d74;">Compassion Soup Kitchen · Te Pūaroha · Wellington, Aotearoa</p>
  </div>
</div>`;
}

/** Plain-text alternative for the same content. */
export function buildBrandedEmailText(email: BrandedEmail): string {
  const lines: string[] = [email.heading, ""];
  for (const paragraph of email.paragraphs) {
    lines.push(paragraph, "");
  }
  if (email.cta) {
    lines.push(`${email.cta.label}: ${email.cta.url}`, "");
  }
  if (email.footerNote) {
    lines.push(email.footerNote, "");
  }
  lines.push(
    "Aroha nui,",
    "The Te Pūaroha team",
    "Compassion Soup Kitchen · Te Pūaroha · Wellington, Aotearoa"
  );
  return lines.join("\n");
}
