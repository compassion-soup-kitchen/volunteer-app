import { describe, expect, it } from "vitest";

import { googleAudiences, readGoogleClaims } from "./google-id-token";

describe("googleAudiences", () => {
  it("collects every configured client id", () => {
    expect(
      googleAudiences({
        GOOGLE_CLIENT_ID: "web.apps.googleusercontent.com",
        GOOGLE_IOS_CLIENT_ID: "ios.apps.googleusercontent.com",
        GOOGLE_ANDROID_CLIENT_ID: "android.apps.googleusercontent.com",
      } as NodeJS.ProcessEnv)
    ).toEqual([
      "web.apps.googleusercontent.com",
      "ios.apps.googleusercontent.com",
      "android.apps.googleusercontent.com",
    ]);
  });

  it("drops blanks and de-duplicates", () => {
    expect(
      googleAudiences({
        GOOGLE_CLIENT_ID: "web.apps.googleusercontent.com",
        GOOGLE_IOS_CLIENT_ID: "  ",
        GOOGLE_ANDROID_CLIENT_ID: "web.apps.googleusercontent.com",
      } as NodeJS.ProcessEnv)
    ).toEqual(["web.apps.googleusercontent.com"]);
  });

  it("is empty when nothing is configured", () => {
    expect(googleAudiences({} as NodeJS.ProcessEnv)).toEqual([]);
  });
});

describe("readGoogleClaims", () => {
  const claims = {
    sub: "google-123",
    email: "aroha@gmail.com",
    email_verified: true,
    name: "Aroha",
    picture: "https://lh3.googleusercontent.com/a/aroha",
  };

  it("maps a verified token to an identity", () => {
    expect(readGoogleClaims(claims)).toEqual({
      ok: true,
      identity: {
        sub: "google-123",
        email: "aroha@gmail.com",
        name: "Aroha",
        picture: "https://lh3.googleusercontent.com/a/aroha",
      },
    });
  });

  it("accepts email_verified as the string Google sometimes sends", () => {
    const result = readGoogleClaims({ ...claims, email_verified: "true" });
    expect(result.ok).toBe(true);
  });

  // The whole point of the gate: an unverified Google address would walk
  // straight past the verification credentials accounts must clear.
  it("refuses an unverified email", () => {
    expect(readGoogleClaims({ ...claims, email_verified: false })).toEqual({
      ok: false,
      reason: "email-unverified",
    });
  });

  it("refuses a missing email_verified claim", () => {
    const { email_verified: _omitted, ...withoutFlag } = claims;
    expect(readGoogleClaims(withoutFlag)).toEqual({
      ok: false,
      reason: "email-unverified",
    });
  });

  it("refuses a token with no subject or no email", () => {
    expect(readGoogleClaims({ ...claims, sub: "" })).toEqual({
      ok: false,
      reason: "invalid-token",
    });
    expect(readGoogleClaims({ ...claims, email: undefined })).toEqual({
      ok: false,
      reason: "invalid-token",
    });
  });

  it("nulls out a name or picture that isn't a string", () => {
    const result = readGoogleClaims({
      ...claims,
      name: undefined,
      picture: 42,
    });
    expect(result).toEqual({
      ok: true,
      identity: {
        sub: "google-123",
        email: "aroha@gmail.com",
        name: null,
        picture: null,
      },
    });
  });
});
