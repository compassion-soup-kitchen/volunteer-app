import { describe, expect, it } from "vitest";

import { googleProfileToUser, isOAuthSignInAllowed } from "./google-auth";

describe("googleProfileToUser", () => {
  const claims = {
    sub: "google-sub-1",
    name: "Aroha Williams",
    email: "aroha@b.co",
    picture: "https://lh3.example/photo.jpg",
    email_verified: true,
  };

  it("maps the OIDC claims into our User shape", () => {
    const user = googleProfileToUser(claims);
    expect(user).toMatchObject({
      id: "google-sub-1",
      name: "Aroha Williams",
      email: "aroha@b.co",
      image: "https://lh3.example/photo.jpg",
      role: "PUBLIC",
    });
  });

  it("stamps emailVerified for a Google-verified address", () => {
    expect(googleProfileToUser(claims).emailVerified).toBeInstanceOf(Date);
  });

  it("leaves the account unverified when Google has not verified the address", () => {
    expect(
      googleProfileToUser({ ...claims, email_verified: false }).emailVerified,
    ).toBeNull();
    expect(
      googleProfileToUser({ ...claims, email_verified: undefined }).emailVerified,
    ).toBeNull();
  });
});

describe("isOAuthSignInAllowed", () => {
  it("blocks a Google sign-in unless the address is verified", () => {
    const account = { provider: "google" };
    expect(isOAuthSignInAllowed(account, { email_verified: true })).toBe(true);
    expect(isOAuthSignInAllowed(account, { email_verified: false })).toBe(false);
    expect(isOAuthSignInAllowed(account, { email_verified: null })).toBe(false);
    expect(isOAuthSignInAllowed(account, {})).toBe(false);
    expect(isOAuthSignInAllowed(account, undefined)).toBe(false);
  });

  it("passes non-Google sign-ins through untouched", () => {
    // Credentials sign-ins have no OIDC profile; the gate for them lives in
    // checkCredentials, not here.
    expect(
      isOAuthSignInAllowed({ provider: "credentials" }, undefined),
    ).toBe(true);
    expect(isOAuthSignInAllowed(null, undefined)).toBe(true);
    expect(isOAuthSignInAllowed(undefined, undefined)).toBe(true);
  });
});
