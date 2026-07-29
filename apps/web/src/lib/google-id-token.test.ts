import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stands in for Google's key endpoint - the point of these tests is the
// wiring around the signature check, not jose's own crypto.
const jwtVerifyMock = vi.fn();
const createRemoteJWKSetMock = vi.fn<(url: URL) => string>(() => "remote-jwks");

vi.mock("jose", () => ({
  createRemoteJWKSet: (url: URL) => createRemoteJWKSetMock(url),
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
}));

import {
  googleAudiences,
  readGoogleClaims,
  verifyGoogleIdToken,
} from "./google-id-token";

describe("googleAudiences", () => {
  // Android tokens carry the web client id, so there is no third audience -
  // an Android-specific client id never appears in `aud`.
  it("collects the web and iOS client ids", () => {
    expect(
      googleAudiences({
        GOOGLE_CLIENT_ID: "web.apps.googleusercontent.com",
        GOOGLE_IOS_CLIENT_ID: "ios.apps.googleusercontent.com",
      })
    ).toEqual([
      "web.apps.googleusercontent.com",
      "ios.apps.googleusercontent.com",
    ]);
  });

  it("drops blanks and de-duplicates", () => {
    expect(
      googleAudiences({
        GOOGLE_CLIENT_ID: "web.apps.googleusercontent.com",
        GOOGLE_IOS_CLIENT_ID: "  ",
      })
    ).toEqual(["web.apps.googleusercontent.com"]);
  });

  it("is empty when nothing is configured", () => {
    expect(googleAudiences({})).toEqual([]);
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
    expect(readGoogleClaims({ ...claims, email_verified: undefined })).toEqual({
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

describe("verifyGoogleIdToken", () => {
  const verifiedPayload = {
    sub: "google-123",
    email: "aroha@gmail.com",
    email_verified: true,
    name: "Aroha",
    picture: null,
  };

  beforeEach(() => {
    jwtVerifyMock.mockReset();
    vi.stubEnv("GOOGLE_CLIENT_ID", "web.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_IOS_CLIENT_ID", "ios.apps.googleusercontent.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // An empty audience list would make jose accept a token minted for anyone
  // else's app, so this has to refuse before it ever reaches the verifier.
  it("refuses without verifying when no client ids are configured", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_IOS_CLIENT_ID", "");

    expect(await verifyGoogleIdToken("any-token")).toEqual({
      ok: false,
      reason: "not-configured",
    });
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });

  it("checks the token against Google's issuers and every configured audience", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: verifiedPayload });

    const result = await verifyGoogleIdToken("google-id-token");

    expect(result).toEqual({
      ok: true,
      identity: {
        sub: "google-123",
        email: "aroha@gmail.com",
        name: "Aroha",
        picture: null,
      },
    });
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      "google-id-token",
      "remote-jwks",
      {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: [
          "web.apps.googleusercontent.com",
          "ios.apps.googleusercontent.com",
        ],
      }
    );
  });

  // jose throws for a bad signature, a wrong audience, a foreign issuer and an
  // expired token alike; all of them are the same "no" to the caller.
  it("folds any verification failure into invalid-token", async () => {
    jwtVerifyMock.mockRejectedValueOnce(
      new Error('"exp" claim timestamp check failed')
    );

    expect(await verifyGoogleIdToken("expired")).toEqual({
      ok: false,
      reason: "invalid-token",
    });
  });

  it("still applies the claim rules to a validly-signed token", async () => {
    jwtVerifyMock.mockResolvedValueOnce({
      payload: { ...verifiedPayload, email_verified: false },
    });

    expect(await verifyGoogleIdToken("google-id-token")).toEqual({
      ok: false,
      reason: "email-unverified",
    });
  });

  // The key set is a module-level cache: refetching Google's keys per request
  // would turn every sign-in into an outbound round trip.
  it("builds the remote key set once, from Google's certs endpoint", async () => {
    jwtVerifyMock.mockResolvedValue({ payload: verifiedPayload });
    await verifyGoogleIdToken("first");
    const after = createRemoteJWKSetMock.mock.calls.length;

    await verifyGoogleIdToken("second");
    await verifyGoogleIdToken("third");

    expect(after).toBe(1);
    expect(createRemoteJWKSetMock.mock.calls.length).toBe(after);
    // The trust anchor for the whole flow - worth pinning down.
    expect(createRemoteJWKSetMock.mock.calls[0][0].toString()).toBe(
      "https://www.googleapis.com/oauth2/v3/certs"
    );
  });
});
