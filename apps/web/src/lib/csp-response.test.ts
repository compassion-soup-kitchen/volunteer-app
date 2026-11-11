// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { nextWithCsp } from "./csp-response";

afterEach(() => vi.unstubAllEnvs());

function request() {
  return new NextRequest("https://compassion.example.nz/dashboard", {
    headers: { cookie: "a=b" },
  });
}

/** Next carries request-header overrides on the response as `x-middleware-request-*`. */
function forwarded(response: Response, name: string) {
  return response.headers.get(`x-middleware-request-${name}`);
}

describe("nextWithCsp", () => {
  it("enforces the same nonce'd policy it hands to the route", () => {
    const response = nextWithCsp(request());
    const csp = response.headers.get("Content-Security-Policy");
    const nonce = forwarded(response, "x-nonce");

    expect(nonce).toBeTruthy();
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(forwarded(response, "content-security-policy")).toBe(csp);
  });

  it("keeps the incoming request headers", () => {
    const response = nextWithCsp(request());

    expect(forwarded(response, "cookie")).toBe("a=b");
    expect(response.headers.get("x-middleware-override-headers")).toContain("cookie");
  });

  it("mints a new nonce for every request", () => {
    const first = forwarded(nextWithCsp(request()), "x-nonce");
    const second = forwarded(nextWithCsp(request()), "x-nonce");

    expect(first).not.toBe(second);
  });

  it("only allows eval in development", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(nextWithCsp(request()).headers.get("Content-Security-Policy")).not.toContain(
      "'unsafe-eval'",
    );

    vi.stubEnv("NODE_ENV", "development");
    expect(nextWithCsp(request()).headers.get("Content-Security-Policy")).toContain(
      "'unsafe-eval'",
    );
  });
});
