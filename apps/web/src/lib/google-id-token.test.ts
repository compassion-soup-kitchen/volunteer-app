import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stands in for Google's key endpoint - the point of these tests is the
// wiring around the signature check, not jose's own crypto.
const jwtVerifyMock = vi.fn();
const decodeJwtMock = vi.fn<(token: string) => unknown>(() => ({}));
const createRemoteJWKSetMock = vi.fn<(url: URL) => string>(() => "remote-jwks");

vi.mock("jose", () => ({
  createRemoteJWKSet: (url: URL) => createRemoteJWKSetMock(url),
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
  decodeJwt: (token: string) => decodeJwtMock(token),
}));

import {
  describeRejectedToken,
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

describe("describeRejectedToken", () => {
  const configured = [
    "web.apps.googleusercontent.com",
    "ios.apps.googleusercontent.com",
  ];

  // The failure this exists for: the iOS build's tokens are audienced to the
  // iOS client id, so a server missing GOOGLE_IOS_CLIENT_ID refuses every one
  // of them with nothing in the response to say so.
  it("names an audience the server was never configured with", () => {
    const diagnosis = describeRejectedToken(
      { aud: "ios.apps.googleusercontent.com", iss: "https://accounts.google.com" },
      ["web.apps.googleusercontent.com"],
      new Error('unexpected "aud" claim value')
    );

    expect(diagnosis).toContain("ios.apps.googleusercontent.com");
    expect(diagnosis).toContain("GOOGLE_IOS_CLIENT_ID");
  });

  it("accepts an audience array that contains a configured client id", () => {
    const diagnosis = describeRejectedToken(
      { aud: ["someone-else.apps.googleusercontent.com", configured[1]] },
      configured,
      new Error("signature verification failed")
    );

    expect(diagnosis).not.toContain("GOOGLE_IOS_CLIENT_ID");
    expect(diagnosis).toContain("signature verification failed");
  });

  it("calls out a foreign issuer", () => {
    expect(
      describeRejectedToken(
        { aud: configured[0], iss: "https://login.example.com" },
        configured,
        new Error("nope")
      )
    ).toBe('issuer "https://login.example.com" is not Google');
  });

  // The claims are decoded without being verified, so a hostile caller picks
  // them: unescaped, a newline would let them forge whole log lines and drop a
  // convincing `[audit]` entry in front of whoever is reading (CWE-117).
  it("escapes claims that would otherwise forge extra log lines", () => {
    const diagnosis = describeRejectedToken(
      { aud: '\n[audit] user permanently deleted { "id": "usr_1" }' },
      configured,
      new Error("unexpected \"aud\" claim value")
    );

    expect(diagnosis).not.toContain("\n");
    expect(diagnosis).toContain("\\n[audit]");
  });

  it("escapes a forged issuer and error message too", () => {
    expect(
      describeRejectedToken(
        { aud: configured[0], iss: "https://evil.example\nfake log line" },
        configured,
        new Error("boom")
      )
    ).not.toContain("\n");

    expect(
      describeRejectedToken(
        { aud: configured[0] },
        configured,
        new Error("boom\nfake log line")
      )
    ).not.toContain("\n");
  });

  // Distinguishes "somebody sent us rubbish" from "this container can't reach
  // Google's certs endpoint", which look identical without the error code.
  it("surfaces jose's error code for a right-audience failure", () => {
    const error = Object.assign(new Error("request timed out"), {
      code: "ERR_JWKS_TIMEOUT",
    });

    expect(describeRejectedToken({ aud: configured[0] }, configured, error)).toBe(
      'signature or claim check failed ["ERR_JWKS_TIMEOUT"]: "request timed out"'
    );
  });

  it("reports a token that wasn't a JWT at all", () => {
    expect(describeRejectedToken(null, configured, new Error("bad"))).toBe(
      "not a well-formed JWT"
    );
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

  // The response says nothing on purpose, so the log has to say everything.
  it("logs why the token was refused", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    decodeJwtMock.mockReturnValueOnce({
      aud: "some-other-app.apps.googleusercontent.com",
    });
    jwtVerifyMock.mockRejectedValueOnce(
      new Error('unexpected "aud" claim value')
    );

    await verifyGoogleIdToken("wrong-audience");

    expect(warn).toHaveBeenCalledWith(
      "[google-id-token] refused a token:",
      expect.stringContaining("some-other-app.apps.googleusercontent.com")
    );
    warn.mockRestore();
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
