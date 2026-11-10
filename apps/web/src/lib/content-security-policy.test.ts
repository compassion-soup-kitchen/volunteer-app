import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  createNonce,
} from "./content-security-policy";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((part) => {
      const [name, ...sources] = part.split(" ");
      return [name, sources];
    }),
  );
}

describe("buildContentSecurityPolicy", () => {
  const prod = directives(buildContentSecurityPolicy({ nonce: "abc123", isDev: false }));

  it("allows scripts only by nonce, passing trust on with strict-dynamic", () => {
    expect(prod.get("script-src")).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  });

  it("never allows inline script or eval in production", () => {
    const scripts = prod.get("script-src")!;
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it("allows eval in development only, for React's error stacks", () => {
    const dev = directives(buildContentSecurityPolicy({ nonce: "abc123", isDev: true }));
    expect(dev.get("script-src")).toContain("'unsafe-eval'");
  });

  it("defines a fallback and locks down plugins, base and form targets", () => {
    expect(prod.get("default-src")).toEqual(["'self'"]);
    expect(prod.get("object-src")).toEqual(["'none'"]);
    expect(prod.get("base-uri")).toEqual(["'self'"]);
    expect(prod.get("form-action")).toEqual(["'self'"]);
  });

  it("keeps awhinatech.nz allowed to frame the site", () => {
    expect(prod.get("frame-ancestors")).toEqual([
      "'self'",
      "https://awhinatech.nz",
      "https://*.awhinatech.nz",
    ]);
  });

  it("lets Google profile pictures and Places autocomplete through", () => {
    expect(prod.get("img-src")).toContain("https://lh3.googleusercontent.com");
    expect(prod.get("connect-src")).toContain("https://places.googleapis.com");
  });

  it("never uses a bare wildcard source", () => {
    for (const sources of prod.values()) expect(sources).not.toContain("*");
  });
});

describe("createNonce", () => {
  it("is fresh on every call and is 128 bits of base64", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });
});
