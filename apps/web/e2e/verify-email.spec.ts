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
});
