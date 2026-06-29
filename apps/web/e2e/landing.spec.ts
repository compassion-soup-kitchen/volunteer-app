import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders the hero and primary calls-to-action", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /volunteer with us/i }),
    ).toBeVisible();

    // App download is the primary CTA.
    await expect(
      page.getByRole("link", { name: /get the app/i }).first(),
    ).toHaveAttribute("href", "#download");
    await expect(
      page.getByRole("link", { name: /download on the app store/i }).first(),
    ).toBeVisible();
  });

  test("navigates from landing to /register", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /become a volunteer/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeVisible();
  });

  test("navigates from landing to /login", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /^sign in$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
