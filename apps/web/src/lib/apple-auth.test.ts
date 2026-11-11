import { describe, expect, it } from "vitest";
import {
  appleFormPostCookies,
  appleProfileToUser,
  isAppleEmailVerified,
  usesSecureCookies,
} from "./apple-auth";

describe("appleProfileToUser", () => {
  const claims = { sub: "001234.abc", email: "Aroha@iCloud.com", email_verified: "true" as const };

  it("keys the user on Apple's sub and creates a PUBLIC applicant", () => {
    expect(appleProfileToUser(claims)).toMatchObject({
      id: "001234.abc",
      role: "PUBLIC",
      image: null,
    });
  });

  // Same rule as every other way into `User.email`, so the app and the web
  // can't make two accounts that differ only by case.
  it("lower-cases the address", () => {
    expect(appleProfileToUser(claims).email).toBe("aroha@icloud.com");
  });

  it("takes the name from Apple's first-authorisation user field", () => {
    const user = appleProfileToUser({
      ...claims,
      user: { name: { firstName: " Aroha ", lastName: "Wīremu" } },
    });
    expect(user.name).toBe("Aroha Wīremu");
  });

  // Auth.js's own mapping produced "Aroha undefined" here.
  it("copes with only one part of the name", () => {
    expect(
      appleProfileToUser({ ...claims, user: { name: { firstName: "Aroha" } } }).name
    ).toBe("Aroha");
  });

  // ...and fell back to the email address, greeting relay users by it.
  it("leaves the name empty rather than using the email", () => {
    expect(appleProfileToUser(claims).name).toBeNull();
    expect(appleProfileToUser({ ...claims, user: { name: null } }).name).toBeNull();
  });

  it("has no email when Apple sent none", () => {
    expect(appleProfileToUser({ sub: "001234.abc" }).email).toBeNull();
  });
});

describe("isAppleEmailVerified", () => {
  it("accepts Apple's boolean and string forms", () => {
    expect(isAppleEmailVerified(true)).toBe(true);
    expect(isAppleEmailVerified("true")).toBe(true);
  });

  it("refuses anything else", () => {
    for (const value of [false, "false", null, undefined, 1, "yes"]) {
      expect(isAppleEmailVerified(value), String(value)).toBe(false);
    }
  });
});

describe("appleFormPostCookies", () => {
  // SameSite=None is only legal with Secure, and Apple won't return to http.
  it("leaves the defaults alone over plain http", () => {
    expect(appleFormPostCookies(false)).toBeUndefined();
  });

  it("lets the three cookies the callback reads survive Apple's cross-site POST", () => {
    const cookies = appleFormPostCookies(true)!;
    for (const key of ["state", "nonce", "callbackUrl"] as const) {
      expect(cookies[key].options, key).toMatchObject({
        sameSite: "none",
        secure: true,
        httpOnly: true,
      });
    }
  });

  // The names must match Auth.js's secure defaults exactly, or the override
  // writes one cookie and Auth.js reads another.
  it("uses Auth.js's secure cookie names", () => {
    const cookies = appleFormPostCookies(true)!;
    expect(cookies.state.name).toBe("__Secure-authjs.state");
    expect(cookies.nonce.name).toBe("__Secure-authjs.nonce");
    expect(cookies.callbackUrl.name).toBe("__Secure-authjs.callback-url");
  });

  it("keeps the state and nonce short-lived", () => {
    const cookies = appleFormPostCookies(true)!;
    expect(cookies.state.options.maxAge).toBe(900);
    expect(cookies.nonce.options.maxAge).toBe(900);
  });
});

describe("usesSecureCookies", () => {
  it("follows the configured URL first, as Auth.js does", () => {
    expect(usesSecureCookies("http://internal:3000/x", { NEXTAUTH_URL: "https://app.nz" })).toBe(true);
    expect(usesSecureCookies("https://app.nz/x", { AUTH_URL: "http://localhost:3000" })).toBe(false);
  });

  it("falls back to the request's own URL", () => {
    expect(usesSecureCookies("https://app.nz/api/auth/signin", {})).toBe(true);
    expect(usesSecureCookies("http://localhost:3000/api/auth/signin", {})).toBe(false);
  });

  it("is not secure with nothing to go on", () => {
    expect(usesSecureCookies(undefined, {})).toBe(false);
  });
});
