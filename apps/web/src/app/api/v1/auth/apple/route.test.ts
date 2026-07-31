import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const verifyAppleIdTokenMock = vi.fn();
const signInWithAppleIdentityMock = vi.fn();
const exchangeAppleAuthorizationCodeMock = vi.fn();
const issueApiTokenMock = vi.fn();

vi.mock("@/lib/apple-id-token", () => ({
  verifyAppleIdToken: (...args: unknown[]) => verifyAppleIdTokenMock(...args),
}));

vi.mock("@/lib/data/apple-accounts", () => ({
  signInWithAppleIdentity: (...args: unknown[]) =>
    signInWithAppleIdentityMock(...args),
}));

vi.mock("@/lib/apple-api", () => ({
  exchangeAppleAuthorizationCode: (...args: unknown[]) =>
    exchangeAppleAuthorizationCodeMock(...args),
}));

vi.mock("@/lib/api/token", () => ({
  issueApiToken: (...args: unknown[]) => issueApiTokenMock(...args),
}));

import { POST } from "./route";

function request(body: unknown): NextRequest {
  return new Request("http://test.local/api/v1/auth/apple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const identity = { sub: "001234.abc", email: "aroha@icloud.com", isPrivateEmail: false };

const user = {
  id: "u1",
  name: "Aroha",
  email: "aroha@icloud.com",
  image: null,
  role: "VOLUNTEER",
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyAppleIdTokenMock.mockResolvedValue({ ok: true, identity });
  signInWithAppleIdentityMock.mockResolvedValue({
    ok: true,
    user,
    created: false,
  });
  exchangeAppleAuthorizationCodeMock.mockResolvedValue("refresh-1");
  issueApiTokenMock.mockResolvedValue("bearer-token");
});

describe("POST /api/v1/auth/apple", () => {
  it("rejects a body with no identity token before verifying anything", async () => {
    const res = await POST(request({}));

    expect(res.status).toBe(400);
    expect(verifyAppleIdTokenMock).not.toHaveBeenCalled();
  });

  // The cap stops an unbounded body reaching the verifier.
  it("rejects an implausibly long token", async () => {
    const res = await POST(request({ identityToken: "x".repeat(4097) }));
    expect(res.status).toBe(400);
  });

  it("hands back a bearer token and the user on success", async () => {
    const res = await POST(request({ identityToken: "token" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      token: "bearer-token",
      user: { id: "u1", email: "aroha@icloud.com" },
    });
    expect(issueApiTokenMock).toHaveBeenCalledWith("u1");
  });

  it("answers 201 when the sign-in created the account", async () => {
    signInWithAppleIdentityMock.mockResolvedValue({
      ok: true,
      user,
      created: true,
    });

    expect((await POST(request({ identityToken: "token" }))).status).toBe(201);
  });

  describe("the fields only Apple needs", () => {
    it("exchanges the authorization code and passes the refresh token on", async () => {
      await POST(
        request({
          identityToken: "token",
          authorizationCode: "code-1",
          fullName: "Aroha Wīremu",
        })
      );

      expect(exchangeAppleAuthorizationCodeMock).toHaveBeenCalledWith("code-1");
      expect(signInWithAppleIdentityMock).toHaveBeenCalledWith({
        identity,
        fullName: "Aroha Wīremu",
        refreshToken: "refresh-1",
      });
    });

    it("skips the round trip when Apple issued no code", async () => {
      await POST(request({ identityToken: "token" }));

      expect(exchangeAppleAuthorizationCodeMock).not.toHaveBeenCalled();
      expect(signInWithAppleIdentityMock).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: null })
      );
    });

    // A failed exchange must not fail the sign-in - it only costs the ability
    // to revoke later, which is logged.
    it("signs in anyway when the exchange fails", async () => {
      exchangeAppleAuthorizationCodeMock.mockResolvedValue(null);

      const res = await POST(
        request({ identityToken: "token", authorizationCode: "code-1" })
      );

      expect(res.status).toBe(200);
    });
  });

  describe("refusals", () => {
    it("says so when the server has no Apple client id", async () => {
      verifyAppleIdTokenMock.mockResolvedValue({
        ok: false,
        reason: "not-configured",
      });

      const res = await POST(request({ identityToken: "token" }));

      expect(res.status).toBe(503);
      await expect(res.json()).resolves.toMatchObject({
        code: "APPLE_NOT_CONFIGURED",
      });
    });

    it("refuses an address Apple hasn't verified", async () => {
      verifyAppleIdTokenMock.mockResolvedValue({
        ok: false,
        reason: "email-unverified",
      });

      const res = await POST(request({ identityToken: "token" }));

      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toMatchObject({
        code: "EMAIL_NOT_VERIFIED",
      });
    });

    // Deliberately opaque: a forged signature and a wrong audience look the
    // same from outside. The reason goes to the log, not the caller.
    it("gives one flat 401 for any other verification failure", async () => {
      verifyAppleIdTokenMock.mockResolvedValue({
        ok: false,
        reason: "invalid-token",
      });

      const res = await POST(request({ identityToken: "token" }));

      expect(res.status).toBe(401);
      await expect(res.json()).resolves.not.toHaveProperty("code");
      expect(signInWithAppleIdentityMock).not.toHaveBeenCalled();
    });

    it("points at password sign-in when the email is already taken", async () => {
      signInWithAppleIdentityMock.mockResolvedValue({
        ok: false,
        reason: "not-linked",
      });

      const res = await POST(request({ identityToken: "token" }));

      expect(res.status).toBe(409);
      await expect(res.json()).resolves.toMatchObject({
        code: "ACCOUNT_NOT_LINKED",
      });
    });

    // Almost always a deleted account whose token we failed to revoke, so the
    // message has to explain how to get out of it.
    it("explains the no-email dead end", async () => {
      signInWithAppleIdentityMock.mockResolvedValue({
        ok: false,
        reason: "no-email",
      });

      const res = await POST(request({ identityToken: "token" }));

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe("APPLE_NO_EMAIL");
      expect(body.error).toContain("Sign in with Apple");
    });

    it("locks out an archived account", async () => {
      signInWithAppleIdentityMock.mockResolvedValue({
        ok: false,
        reason: "archived",
      });

      const res = await POST(request({ identityToken: "token" }));

      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toMatchObject({
        code: "ACCOUNT_ARCHIVED",
      });
      expect(issueApiTokenMock).not.toHaveBeenCalled();
    });
  });
});
