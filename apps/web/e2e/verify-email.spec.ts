import { expect, test } from "@playwright/test";

test.describe("Verify email page", () => {
  test("without a token, explains the problem and offers a resend form", async ({
    page,
  }) => {
    await page.goto("/verify-email");

    await expect(
      page.getByRole("heading", { name: /confirm your email/i }),
    ).toBeVisible();
    // Next's route announcer is also role="alert", so filter to ours.
    await expect(
      page.getByRole("alert").filter({ hasText: /missing its token/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /resend verification email/i }),
    ).toBeVisible();
  });

  test("with a token, waits for an explicit confirm click", async ({
    page,
  }) => {
    await page.goto("/verify-email?token=sample-token");

    // The single-use token must survive the page merely being opened
    // (mail-security scanners pre-render links), so redemption sits behind
    // a button rather than firing on load.
    await expect(
      page.getByRole("button", { name: /confirm my email/i }),
    ).toBeVisible();
  });
});
