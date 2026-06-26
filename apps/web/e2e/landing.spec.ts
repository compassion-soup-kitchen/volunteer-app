import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders the hero and primary calls-to-action", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /every meal is an act/i }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: /become a volunteer/i }).first(),
    ).toHaveAttribute("href", "/register");
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
      .getByRole("link", { name: /see upcoming shifts/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
