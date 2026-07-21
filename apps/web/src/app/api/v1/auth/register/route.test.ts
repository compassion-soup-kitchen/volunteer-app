import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { clearRateLimits } from "@/lib/rate-limit";

const createUserAccountMock = vi.fn();
const sendVerificationEmailMock = vi.fn();
const issueApiTokenMock = vi.fn();

vi.mock("@/lib/data/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/users")>();
  return {
    ...actual,
    createUserAccount: (...args: unknown[]) => createUserAccountMock(...args),
  };
});

vi.mock("@/lib/email-verification", () => ({
  sendVerificationEmail: (...args: unknown[]) => sendVerificationEmailMock(...args),
}));

vi.mock("@/lib/api/token", () => ({
  issueApiToken: (...args: unknown[]) => issueApiTokenMock(...args),
}));

import { POST } from "./route";

function request(body: unknown): NextRequest {
  return new Request("http://test.local/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const fields = { name: "Aroha", email: "aroha@b.co", password: "longenough" };

const createdUser = {
  id: "u1",
  name: "Aroha",
  email: "aroha@b.co",
  image: null,
  role: "PUBLIC",
};

/** Registration only enters the verification flow when email can be sent. */
function stubEmailConfigured() {
  vi.stubEnv("RESEND_API_KEY", "re_test_123");
  vi.stubEnv("EMAIL_FROM", "Te Pūaroha <noreply@example.org>");
}

beforeEach(() => {
  createUserAccountMock.mockReset();
  sendVerificationEmailMock.mockReset();
  issueApiTokenMock.mockReset();
  sendVerificationEmailMock.mockResolvedValue({ ok: true, id: "email_1" });
  clearRateLimits();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/v1/auth/register", () => {
  it("returns 400 for an invalid body", async () => {
    const res = await POST(request({ ...fields, name: "A" }));
    expect(res.status).toBe(400);
    expect(createUserAccountMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the email is already taken", async () => {
    createUserAccountMock.mockResolvedValueOnce({
      error: "An account with this email already exists",
    });
    const res = await POST(request(fields));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "An account with this email already exists",
    });
    expect(sendVerificationEmailMock).not.toHaveBeenCalled();
  });

  it("with email configured: creates an unverified account, sends the link, and withholds the token", async () => {
    stubEmailConfigured();
    createUserAccountMock.mockResolvedValueOnce({ user: createdUser });

    const res = await POST(request(fields));

    expect(createUserAccountMock).toHaveBeenCalledWith(
      "Aroha",
      "aroha@b.co",
      "longenough",
      { emailVerified: false },
    );
    expect(sendVerificationEmailMock).toHaveBeenCalledWith("aroha@b.co", "Aroha");
    expect(issueApiTokenMock).not.toHaveBeenCalled();

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.requiresVerification).toBe(true);
    expect(body.token).toBeUndefined();
  });

  it("without email configured: creates a pre-verified account and returns a token", async () => {
    createUserAccountMock.mockResolvedValueOnce({ user: createdUser });
    issueApiTokenMock.mockResolvedValueOnce("jwt-123");

    const res = await POST(request(fields));

    expect(createUserAccountMock).toHaveBeenCalledWith(
      "Aroha",
      "aroha@b.co",
      "longenough",
      { emailVerified: true },
    );
    expect(sendVerificationEmailMock).not.toHaveBeenCalled();

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      token: "jwt-123",
      user: {
        id: "u1",
        name: "Aroha",
        email: "aroha@b.co",
        image: null,
        role: "PUBLIC",
      },
    });
  });

  it("returns 429 once the shared register budget is spent", async () => {
    createUserAccountMock.mockResolvedValue({ user: createdUser });
    issueApiTokenMock.mockResolvedValue("jwt-123");

    for (let i = 0; i < 5; i++) {
      const res = await POST(request(fields));
      expect(res.status).toBe(201);
    }

    const blocked = await POST(request(fields));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(createUserAccountMock).toHaveBeenCalledTimes(5);
  });
});
