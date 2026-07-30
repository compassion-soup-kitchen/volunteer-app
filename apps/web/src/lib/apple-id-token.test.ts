import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stands in for Apple's key endpoint - the point of these tests is the wiring
// around the signature check, not jose's own crypto.
const jwtVerifyMock = vi.fn();
const decodeJwtMock = vi.fn<(token: string) => unknown>(() => ({}));
const createRemoteJWKSetMock = vi.fn<(url: URL) => string>(() => "remote-jwks");

vi.mock("jose", () => ({
  createRemoteJWKSet: (url: URL) => createRemoteJWKSetMock(url),
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
  decodeJwt: (token: string) => decodeJwtMock(token),
}));

import {
  appleAudiences,
  describeRejectedAppleToken,
  readAppleClaims,
  verifyAppleIdToken,
} from "./apple-id-token";

const BUNDLE_ID = "nz.org.compassion.volunteer";

describe("appleAudiences", () => {
  it("reads the bundle id", () => {
    expect(appleAudiences({ APPLE_CLIENT_ID: BUNDLE_ID })).toEqual([BUNDLE_ID]);
  });

  // Comma-separated so a Services ID for a future web flow, or a second
  // bundle id, can be added without a code change.
  it("splits a comma-separated list and trims it", () => {
    expect(
      appleAudiences({ APPLE_CLIENT_ID: ` ${BUNDLE_ID} , nz.org.compassion.web ` })
    ).toEqual([BUNDLE_ID, "nz.org.compassion.web"]);
  });

  it("drops duplicates and blanks", () => {
    expect(
      appleAudiences({ APPLE_CLIENT_ID: `${BUNDLE_ID},,${BUNDLE_ID}` })
    ).toEqual([BUNDLE_ID]);
  });

  it("is empty when nothing is configured", () => {
    expect(appleAudiences({})).toEqual([]);
  });
});

describe("readAppleClaims", () => {
  it("reads a first sign-in, with the email present", () => {
    expect(
      readAppleClaims({
        sub: "001234.abc",
        email: "aroha@example.org.nz",
        email_verified: "true",
      })
    ).toEqual({
      ok: true,
      identity: {
        sub: "001234.abc",
        email: "aroha@example.org.nz",
        isPrivateEmail: false,
      },
    });
  });

  it("accepts email_verified as a real boolean too", () => {
    const result = readAppleClaims({
      sub: "001234.abc",
      email: "aroha@example.org.nz",
      email_verified: true,
    });
    expect(result.ok).toBe(true);
  });

  // The relay address is the whole point of "Hide My Email" - it must be
  // accepted, and flagged so the sending domain requirement is visible.
  it("flags a private relay address", () => {
    const result = readAppleClaims({
      sub: "001234.abc",
      email: "xyz@privaterelay.appleid.com",
      email_verified: true,
      is_private_email: "true",
    });
    expect(result).toMatchObject({
      ok: true,
      identity: { isPrivateEmail: true },
    });
  });

  // Apple sends the address on the first authorisation only. A returning
  // person arrives with `sub` alone, and that is not an error - the linked
  // account holds their address.
  it("accepts a repeat sign-in that carries no email", () => {
    expect(readAppleClaims({ sub: "001234.abc" })).toEqual({
      ok: true,
      identity: { sub: "001234.abc", email: null, isPrivateEmail: false },
    });
  });

  it("refuses an unverified address when one is present", () => {
    expect(
      readAppleClaims({
        sub: "001234.abc",
        email: "aroha@example.org.nz",
        email_verified: false,
      })
    ).toEqual({ ok: false, reason: "email-unverified" });
  });

  it("refuses a token with no subject", () => {
    expect(readAppleClaims({ email: "aroha@example.org.nz" })).toEqual({
      ok: false,
      reason: "invalid-token",
    });
  });

  it("refuses a blank subject", () => {
    expect(readAppleClaims({ sub: "   " })).toEqual({
      ok: false,
      reason: "invalid-token",
    });
  });
});

describe("describeRejectedAppleToken", () => {
  it("says so when the token was not a JWT at all", () => {
    expect(describeRejectedAppleToken(null, {}, new Error("bad"))).toBe(
      "not a well-formed JWT"
    );
  });

  it("names an audience the server does not accept", () => {
    expect(
      describeRejectedAppleToken(
        { aud: "com.someone.else" },
        { APPLE_CLIENT_ID: BUNDLE_ID },
        new Error("bad")
      )
    ).toContain('audience "com.someone.else" is not a client id this server accepts');
  });

  it("points at the missing env when nothing is configured", () => {
    expect(
      describeRejectedAppleToken({ aud: BUNDLE_ID }, {}, new Error("bad"))
    ).toContain("APPLE_CLIENT_ID is not set");
  });

  it("names a non-Apple issuer", () => {
    expect(
      describeRejectedAppleToken(
        { aud: BUNDLE_ID, iss: "https://accounts.google.com" },
        { APPLE_CLIENT_ID: BUNDLE_ID },
        new Error("bad")
      )
    ).toBe('issuer "https://accounts.google.com" is not Apple');
  });

  // Claims come out of an unverified token, so a newline in one would let a
  // hostile caller forge extra log lines (CWE-117).
  it("escapes control characters in quoted claims", () => {
    const described = describeRejectedAppleToken(
      { aud: BUNDLE_ID, iss: "evil\nissuer: trusted" },
      { APPLE_CLIENT_ID: BUNDLE_ID },
      new Error("bad")
    );
    expect(described).not.toContain("\n");
    expect(described).toContain("\\n");
  });

  it("falls back to jose's verdict, with its error code", () => {
    const error = Object.assign(new Error("signature verification failed"), {
      code: "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
    });
    const described = describeRejectedAppleToken(
      { aud: BUNDLE_ID, iss: "https://appleid.apple.com" },
      { APPLE_CLIENT_ID: BUNDLE_ID },
      error
    );
    expect(described).toContain("ERR_JWS_SIGNATURE_VERIFICATION_FAILED");
    expect(described).toContain("signature verification failed");
  });
});

describe("verifyAppleIdToken", () => {
  const originalEnv = process.env.APPLE_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.APPLE_CLIENT_ID = BUNDLE_ID;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalEnv === undefined) delete process.env.APPLE_CLIENT_ID;
    else process.env.APPLE_CLIENT_ID = originalEnv;
  });

  // With no client id every token would verify against an empty audience list,
  // so tokens minted for somebody else's app would sail through.
  it("refuses outright when no client id is configured", async () => {
    delete process.env.APPLE_CLIENT_ID;
    expect(await verifyAppleIdToken("token")).toEqual({
      ok: false,
      reason: "not-configured",
    });
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });

  it("verifies against Apple's issuer and the configured audience", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { sub: "001234.abc", email: "a@b.nz", email_verified: true },
    });

    const result = await verifyAppleIdToken("token");

    expect(result).toMatchObject({ ok: true });
    expect(jwtVerifyMock).toHaveBeenCalledWith("token", "remote-jwks", {
      issuer: "https://appleid.apple.com",
      audience: [BUNDLE_ID],
    });
  });

  it("reports an invalid token when the signature check throws", async () => {
    jwtVerifyMock.mockRejectedValue(new Error("nope"));
    expect(await verifyAppleIdToken("token")).toEqual({
      ok: false,
      reason: "invalid-token",
    });
  });
});
