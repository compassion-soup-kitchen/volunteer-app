import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("robots", () => {
  it("allows only the public pages and points at the sitemap on the runtime origin", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://compassion.example.nz/");
    const result = robots();

    expect(result.rules).toEqual({
      userAgent: "*",
      allow: ["/$", "/register", "/login", "/privacy", "/support", "/copyright"],
      disallow: "/",
    });
    expect(result.sitemap).toBe("https://compassion.example.nz/sitemap.xml");
  });
});

describe("sitemap", () => {
  it("lists the public pages as absolute URLs, the home page without a trailing slash", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://compassion.example.nz");

    expect(sitemap().map((entry) => entry.url)).toEqual([
      "https://compassion.example.nz",
      "https://compassion.example.nz/register",
      "https://compassion.example.nz/login",
      "https://compassion.example.nz/privacy",
      "https://compassion.example.nz/support",
      "https://compassion.example.nz/copyright",
    ]);
  });

  it("never lists token-redeeming or internal pages", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://compassion.example.nz");
    const urls = sitemap().map((entry) => entry.url).join(" ");

    for (const path of ["/reset-password", "/verify-email", "/styleguide", "/staff", "/dashboard"]) {
      expect(urls).not.toContain(path);
    }
  });
});
