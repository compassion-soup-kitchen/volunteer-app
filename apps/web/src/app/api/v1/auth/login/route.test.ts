import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { clearRateLimits } from "@/lib/rate-limit";

const checkCredentialsMock = vi.fn();
const issueApiTokenMock = vi.fn();

vi.mock("@/lib/data/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/users")>();
  return {
    ...actual,
    checkCredentials: (...args: unknown[]) => checkCredentialsMock(...args),
  };
});

vi.mock("@/lib/api/token", () => ({
  issueApiToken: (...args: unknown[]) => issueApiTokenMock(...args),
}));

import { POST } from "./route";

function request(body: unknown): NextRequest {
  return new Request("http://test.local/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const user = {
  id: "u1",
  name: "Aroha",
  email: "aroha@b.co",
  image: null,
  role: "VOLUNTEER",
};

beforeEach(() => {
  checkCredentialsMock.mockReset();
  issueApiTokenMock.mockReset();
  clearRateLimits();
});

describe("POST /api/v1/auth/login", () => {
  it("returns 400 for an invalid body", async () => {
    const res = await POST(request({ email: "nope", password: "" }));
    expect(res.status).toBe(400);
    expect(checkCredentialsMock).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid credentials", async () => {
    checkCredentialsMock.mockResolvedValueOnce({
      ok: false,
      reason: "invalid-credentials",
    });
    const res = await POST(request({ email: "aroha@b.co", password: "wrong" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid email or password" });
    expect(issueApiTokenMock).not.toHaveBeenCalled();
  });

  it("returns 401 for archived accounts, same as invalid credentials", async () => {
    checkCredentialsMock.mockResolvedValueOnce({ ok: false, reason: "archived" });
    const res = await POST(request({ email: "gone@b.co", password: "pw" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid email or password" });
  });

  it("returns 403 with EMAIL_NOT_VERIFIED for unverified accounts", async () => {
    checkCredentialsMock.mockResolvedValueOnce({
      ok: false,
      reason: "email-unverified",
    });
    const res = await POST(request({ email: "aroha@b.co", password: "right" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("EMAIL_NOT_VERIFIED");
    expect(body.error).toMatch(/verify your email/i);
    expect(issueApiTokenMock).not.toHaveBeenCalled();
  });

  it("returns a token and the serialized user on success", async () => {
    checkCredentialsMock.mockResolvedValueOnce({ ok: true, user });
    issueApiTokenMock.mockResolvedValueOnce("jwt-123");

    const res = await POST(request({ email: "Aroha@B.co", password: "right" }));

    expect(res.status).toBe(200);
    expect(issueApiTokenMock).toHaveBeenCalledWith("u1");
    expect(await res.json()).toEqual({
      token: "jwt-123",
      user: {
        id: "u1",
        name: "Aroha",
        email: "aroha@b.co",
        image: null,
        role: "VOLUNTEER",
      },
    });
  });

  it("returns 429 with Retry-After once the shared login budget is spent", async () => {
    checkCredentialsMock.mockResolvedValue({
      ok: false,
      reason: "invalid-credentials",
    });

    for (let i = 0; i < 10; i++) {
      const res = await POST(request({ email: "busy@b.co", password: "pw" }));
      expect(res.status).toBe(401);
    }

    const blocked = await POST(request({ email: "Busy@B.co", password: "pw" }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(checkCredentialsMock).toHaveBeenCalledTimes(10);
  });
});
