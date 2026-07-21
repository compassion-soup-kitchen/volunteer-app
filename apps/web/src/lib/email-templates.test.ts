import { describe, expect, it } from "vitest";

import {
  applicationDecisionEmail,
  applicationReceivedEmail,
  passwordResetEmail,
  verificationEmail,
} from "./email-templates";

const BASE = "https://app.example.org";

describe("verificationEmail", () => {
  it("carries the verify link and a personal greeting", () => {
    const { subject, content } = verificationEmail(
      "Aroha",
      `${BASE}/verify-email?token=t1`,
    );
    expect(subject).toMatch(/confirm your email/i);
    expect(content.cta?.url).toBe(`${BASE}/verify-email?token=t1`);
    expect(content.paragraphs[0]).toBe("Kia ora Aroha,");
  });

  it("falls back to a plain greeting without a name", () => {
    const { content } = verificationEmail(null, `${BASE}/verify-email?token=t1`);
    expect(content.paragraphs[0]).toBe("Kia ora,");
  });
});

describe("passwordResetEmail", () => {
  it("carries the reset link", () => {
    const { subject, content } = passwordResetEmail(
      "Aroha",
      `${BASE}/reset-password?token=t2`,
    );
    expect(subject).toMatch(/password/i);
    expect(content.cta?.url).toBe(`${BASE}/reset-password?token=t2`);
  });
});

describe("applicationReceivedEmail", () => {
  it("links back to the application page", () => {
    const { subject, content } = applicationReceivedEmail(
      "Aroha Williams",
      `${BASE}/application`,
    );
    expect(subject).toMatch(/application has arrived/i);
    expect(content.cta?.url).toBe(`${BASE}/application`);
    expect(content.paragraphs[0]).toBe("Kia ora Aroha Williams,");
  });
});

describe("applicationDecisionEmail", () => {
  it("sends approved volunteers to their dashboard", () => {
    const { subject, content } = applicationDecisionEmail(
      "Aroha",
      "APPROVED",
      BASE,
    );
    expect(subject).toMatch(/approved/i);
    expect(content.cta?.url).toBe(`${BASE}/dashboard`);
  });

  it("sends info requests back to the application page", () => {
    const { subject, content } = applicationDecisionEmail(
      "Aroha",
      "INFO_REQUESTED",
      BASE,
    );
    expect(subject).toMatch(/more details/i);
    expect(content.cta?.url).toBe(`${BASE}/application`);
  });

  it("declines gently, with no call to action", () => {
    const { subject, content } = applicationDecisionEmail(
      "Aroha",
      "DECLINED",
      BASE,
    );
    expect(subject).toMatch(/update on your volunteer application/i);
    expect(content.cta).toBeUndefined();
  });

  it("greets by first name when known", () => {
    expect(
      applicationDecisionEmail("Aroha", "APPROVED", BASE).content.paragraphs[0],
    ).toBe("Kia ora Aroha,");
    expect(
      applicationDecisionEmail(null, "APPROVED", BASE).content.paragraphs[0],
    ).toBe("Kia ora,");
  });
});
