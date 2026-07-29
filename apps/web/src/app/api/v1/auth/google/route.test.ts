import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const verifyGoogleIdTokenMock = vi.fn();
const signInWithGoogleIdentityMock = vi.fn();
const issueApiTokenMock = vi.fn();

vi.mock("@/lib/google-id-token", () => ({
  verifyGoogleIdToken: (...args: unknown[]) => verifyGoogleIdTokenMock(...args),
}));

vi.mock("@/lib/data/google-accounts", () => ({
  signInWithGoogleIdentity: (...args: unknown[]) =>
    signInWithGoogleIdentityMock(...args),
}));

vi.mock("@/lib/api/token", () => ({
  issueApiToken: (...args: unknown[]) => issueApiTokenMock(...args),
}));

import { POST } from "./route";

function request(body: unknown): NextRequest {
  return new Request("http://test.local/api/v1/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const identity = {
  sub: "google-123",
  email: "aroha@gmail.com",
  name: "Aroha",
  picture: null,
};

const user = {
  id: "u1",
  name: "Aroha",
  email: "aroha@gmail.com",
  image: null,
  role: "VOLUNTEER",
};

beforeEach(() => {
  verifyGoogleIdTokenMock.mockReset();
  signInWithGoogleIdentityMock.mockReset();
  issueApiTokenMock.mockReset();
});

describe("POST /api/v1/auth/google", () => {
  it("returns 400 for a body with no token", async () => {
    const res = await POST(request({}));
    expect(res.status).toBe(400);
    expect(verifyGoogleIdTokenMock).not.toHaveBeenCalled();
  });

  it("refuses an unbounded token before it reaches the verifier", async () => {
    const res = await POST(request({ idToken: "a".repeat(5000) }));
    expect(res.status).toBe(400);
    expect(verifyGoogleIdTokenMock).not.toHaveBeenCalled();
  });

  it("issues a bearer token for a verified identity", async () => {
    verifyGoogleIdTokenMock.mockResolvedValueOnce({ ok: true, identity });
    signInWithGoogleIdentityMock.mockResolvedValueOnce({
      ok: true,
      user,
      created: false,
    });
    issueApiTokenMock.mockResolvedValueOnce("jwt-abc");

    const res = await POST(request({ idToken: "google-id-token" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      token: "jwt-abc",
      user: {
        id: "u1",
        name: "Aroha",
        email: "aroha@gmail.com",
        image: null,
        role: "VOLUNTEER",
      },
    });
    expect(verifyGoogleIdTokenMock).toHaveBeenCalledWith("google-id-token");
    expect(signInWithGoogleIdentityMock).toHaveBeenCalledWith(identity);
  });

  it("returns 201 when the sign-in created the account", async () => {
    verifyGoogleIdTokenMock.mockResolvedValueOnce({ ok: true, identity });
    signInWithGoogleIdentityMock.mockResolvedValueOnce({
      ok: true,
      user: { ...user, role: "PUBLIC" },
      created: true,
    });
    issueApiTokenMock.mockResolvedValueOnce("jwt-abc");

    const res = await POST(request({ idToken: "google-id-token" }));
    expect(res.status).toBe(201);
  });

  it("returns 401 for a token that doesn't verify", async () => {
    verifyGoogleIdTokenMock.mockResolvedValueOnce({
      ok: false,
      reason: "invalid-token",
    });

    const res = await POST(request({ idToken: "forged" }));

    expect(res.status).toBe(401);
    expect(signInWithGoogleIdentityMock).not.toHaveBeenCalled();
    expect(issueApiTokenMock).not.toHaveBeenCalled();
  });

  it("returns 403 for an unverified Google email", async () => {
    verifyGoogleIdTokenMock.mockResolvedValueOnce({
      ok: false,
      reason: "email-unverified",
    });

    const res = await POST(request({ idToken: "google-id-token" }));

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("returns 503 when no Google client ids are configured", async () => {
    verifyGoogleIdTokenMock.mockResolvedValueOnce({
      ok: false,
      reason: "not-configured",
    });

    const res = await POST(request({ idToken: "google-id-token" }));

    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("GOOGLE_NOT_CONFIGURED");
  });

  it("returns 409 when the email belongs to an unlinked account", async () => {
    verifyGoogleIdTokenMock.mockResolvedValueOnce({ ok: true, identity });
    signInWithGoogleIdentityMock.mockResolvedValueOnce({
      ok: false,
      reason: "not-linked",
    });

    const res = await POST(request({ idToken: "google-id-token" }));

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("ACCOUNT_NOT_LINKED");
    expect(issueApiTokenMock).not.toHaveBeenCalled();
  });

  it("returns 403 for an archived account", async () => {
    verifyGoogleIdTokenMock.mockResolvedValueOnce({ ok: true, identity });
    signInWithGoogleIdentityMock.mockResolvedValueOnce({
      ok: false,
      reason: "archived",
    });

    const res = await POST(request({ idToken: "google-id-token" }));

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("ACCOUNT_ARCHIVED");
    expect(issueApiTokenMock).not.toHaveBeenCalled();
  });
});
