import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXTAUTH_URL: baseURL,
      AUTH_TRUST_HOST: "true",
      // NextAuth logs MissingSecret errors on every request without one; any
      // value works for the public-only flows the suite covers.
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-test-secret",
    },
  },
});
