import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const input = {
  to: "aroha@example.com",
  subject: "Kia ora",
  html: "<p>Kia ora</p>",
  text: "Kia ora",
};

/**
 * The module keeps a "warned once" flag, so each test re-imports a fresh
 * copy after resetting modules and stubbing the env it needs.
 */
async function loadEmail() {
  return import("@/lib/email");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("skips gracefully and warns only once when email is unconfigured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { sendEmail } = await loadEmail();
    expect(await sendEmail(input)).toEqual({ ok: false, skipped: true });
    expect(await sendEmail(input)).toEqual({ ok: false, skipped: true });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("posts to Resend with the API key and payload", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_123");
    vi.stubEnv("EMAIL_FROM", "Te Pūaroha <noreply@example.org>");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "email_1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendEmail } = await loadEmail();
    const result = await sendEmail(input);

    expect(result).toEqual({ ok: true, id: "email_1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer re_test_123"
    );
    expect(JSON.parse(init.body as string)).toEqual({
      from: "Te Pūaroha <noreply@example.org>",
      to: ["aroha@example.com"],
      subject: "Kia ora",
      html: "<p>Kia ora</p>",
      text: "Kia ora",
    });
  });

  it("returns ok: false without throwing when Resend rejects", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_123");
    vi.stubEnv("EMAIL_FROM", "Te Pūaroha <noreply@example.org>");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => "invalid from address",
      })
    );

    const { sendEmail } = await loadEmail();
    await expect(sendEmail(input)).resolves.toEqual({
      ok: false,
      skipped: false,
    });
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("returns ok: false without throwing when the network fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_123");
    vi.stubEnv("EMAIL_FROM", "Te Pūaroha <noreply@example.org>");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));

    const { sendEmail } = await loadEmail();
    await expect(sendEmail(input)).resolves.toEqual({
      ok: false,
      skipped: false,
    });
    expect(error).toHaveBeenCalledTimes(1);
  });
});

describe("buildBrandedEmailHtml", () => {
  it("renders heading, paragraphs, and CTA with escaped content", async () => {
    const { buildBrandedEmailHtml } = await loadEmail();
    const html = buildBrandedEmailHtml({
      preview: "A wee preview",
      heading: "Reset <your> password",
      paragraphs: ["Kia ora Aroha & whānau,"],
      cta: { label: "Choose a new password", url: "https://x.nz/reset?token=abc" },
      footerNote: "You can safely ignore this email.",
    });

    expect(html).toContain("Reset &lt;your&gt; password");
    expect(html).toContain("Kia ora Aroha &amp; whānau,");
    expect(html).toContain('href="https://x.nz/reset?token=abc"');
    expect(html).toContain("Choose a new password");
    expect(html).toContain("A wee preview");
    expect(html).toContain("You can safely ignore this email.");
    expect(html).toContain("Te Pūaroha");
    expect(html).not.toContain("<your>");
  });
});

describe("buildBrandedEmailText", () => {
  it("renders a plain-text version with the CTA link", async () => {
    const { buildBrandedEmailText } = await loadEmail();
    const text = buildBrandedEmailText({
      heading: "Reset your password",
      paragraphs: ["Kia ora,", "Tap the link below."],
      cta: { label: "Choose a new password", url: "https://x.nz/reset?token=abc" },
    });

    expect(text).toContain("Reset your password");
    expect(text).toContain("Kia ora,");
    expect(text).toContain("Choose a new password: https://x.nz/reset?token=abc");
    expect(text).toContain("Aroha nui,");
  });
});
