import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearRateLimits } from "./rate-limit";

const signInMock = vi.fn();
const findUniqueMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const tokenFindFirstMock = vi.fn();
const tokenCreateMock = vi.fn();
const tokenDeleteManyMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

vi.mock("next-auth", () => {
  class FakeAuthError extends Error {}
  return { AuthError: FakeAuthError };
});

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    user: {
      findUnique: findUniqueMock,
      create: createMock,
      update: updateMock,
    },
    verificationToken: {
      findFirst: tokenFindFirstMock,
      create: tokenCreateMock,
      deleteMany: tokenDeleteManyMock,
    },
  }),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
    compare: vi.fn(),
  },
}));

// Keep the real HTML/text builders so tests can pull the reset link out of
// the rendered email; only the actual send is mocked.
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  };
});

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import {
  login,
  register,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from "./auth-actions";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Registration only enters the verification flow when email can be sent. */
function stubEmailConfigured() {
  vi.stubEnv("RESEND_API_KEY", "re_test_123");
  vi.stubEnv("EMAIL_FROM", "Te Pūaroha <noreply@example.org>");
}

beforeEach(() => {
  signInMock.mockReset();
  findUniqueMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  tokenFindFirstMock.mockReset();
  tokenCreateMock.mockReset();
  tokenDeleteManyMock.mockReset();
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue({ ok: true, id: "email_1" });
  clearRateLimits();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("register", () => {
  it("rejects a name that is too short", async () => {
    const result = await register(
      null,
      form({
        name: "A",
        email: "a@b.co",
        password: "longenough",
        confirmPassword: "longenough",
      }),
    );
    expect(result?.error).toMatch(/name/i);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "not-an-email",
        password: "longenough",
        confirmPassword: "longenough",
      }),
    );
    expect(result?.error).toMatch(/email/i);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "a@b.co",
        password: "short",
        confirmPassword: "short",
      }),
    );
    expect(result?.error).toMatch(/8 characters/);
  });

  it("rejects mismatched passwords", async () => {
    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "a@b.co",
        password: "longenough",
        confirmPassword: "different1",
      }),
    );
    expect(result).toEqual({ error: "Passwords do not match" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects when email already exists", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: "u1", email: "a@b.co" });
    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "a@b.co",
        password: "longenough",
        confirmPassword: "longenough",
      }),
    );
    expect(result).toEqual({
      error: "An account with this email already exists",
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("with email configured: creates an unverified account, emails a verification link, and does not sign in", async () => {
    stubEmailConfigured();
    findUniqueMock.mockResolvedValueOnce(null);
    createMock.mockResolvedValueOnce({
      id: "u1",
      name: "Aroha",
      email: "a@b.co",
      image: null,
      role: "PUBLIC",
    });

    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "A@B.co",
        password: "longenough",
        confirmPassword: "longenough",
      }),
    );

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "Aroha",
        email: "a@b.co",
        password: "hashed:longenough",
        role: "PUBLIC",
        emailVerified: null,
      },
    });
    expect(signInMock).not.toHaveBeenCalled();
    expect(result).toEqual({ verificationSentTo: "a@b.co" });

    // Only a sha256 hash of the token is stored, under the verify prefix.
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "email-verify:a@b.co" },
    });
    expect(tokenCreateMock).toHaveBeenCalledTimes(1);
    const created = tokenCreateMock.mock.calls[0][0] as {
      data: { identifier: string; token: string; expires: Date };
    };
    expect(created.data.identifier).toBe("email-verify:a@b.co");
    expect(created.data.token).toMatch(/^[0-9a-f]{64}$/);
    const ttlMs = created.data.expires.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000);

    // The emailed link carries the raw token; the DB only its hash.
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const email = sendEmailMock.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(email.to).toBe("a@b.co");
    expect(email.subject).toMatch(/confirm your email/i);
    const match = email.html.match(/\/verify-email\?token=([0-9a-f]+)/);
    expect(match).not.toBeNull();
    const rawToken = match![1];
    expect(rawToken).not.toBe(created.data.token);
    expect(sha256(rawToken)).toBe(created.data.token);
    expect(email.text).toContain(`/verify-email?token=${rawToken}`);
  });

  it("without email configured: creates a pre-verified account and signs straight in", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    createMock.mockResolvedValueOnce({
      id: "u1",
      name: "Aroha",
      email: "a@b.co",
      image: null,
      role: "PUBLIC",
    });
    signInMock.mockResolvedValueOnce(undefined);

    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "a@b.co",
        password: "longenough",
        confirmPassword: "longenough",
      }),
    );

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "Aroha",
        email: "a@b.co",
        password: "hashed:longenough",
        role: "PUBLIC",
        emailVerified: expect.any(Date),
      },
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "a@b.co",
      password: "longenough",
      redirectTo: "/dashboard",
    });
    expect(result).toBeNull();
  });

  it("rate limits repeated sign-up attempts for the same email", async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "u1" });
    signInMock.mockResolvedValue(undefined);

    const fields = {
      name: "Aroha",
      email: "busy@b.co",
      password: "longenough",
      confirmPassword: "longenough",
    };
    for (let i = 0; i < 5; i++) {
      expect(await register(null, form(fields))).toBeNull();
    }

    const result = await register(null, form(fields));
    expect(result?.error).toMatch(/wait a little while/i);
    expect(createMock).toHaveBeenCalledTimes(5);
  });
});

describe("login", () => {
  it("rejects an invalid email", async () => {
    const result = await login(
      null,
      form({ email: "nope", password: "anything" }),
    );
    expect(result?.error).toMatch(/email/i);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("rejects an empty password", async () => {
    const result = await login(
      null,
      form({ email: "a@b.co", password: "" }),
    );
    expect(result?.error).toMatch(/password/i);
  });

  it("delegates valid credentials to signIn", async () => {
    signInMock.mockResolvedValueOnce(undefined);
    const result = await login(
      null,
      form({ email: "a@b.co", password: "anything" }),
    );
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "a@b.co",
      password: "anything",
      redirectTo: "/dashboard",
    });
    expect(result).toBeNull();
  });

  it("points at verification, not the password, when the account is unverified", async () => {
    signInMock.mockRejectedValueOnce(new AuthError("denied"));
    // The re-check after the AuthError finds a matching password on an
    // unverified account.
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      name: "Aroha",
      image: null,
      role: "PUBLIC",
      password: "stored-hash",
      status: "ACTIVE",
      emailVerified: null,
    });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

    const result = await login(
      null,
      form({ email: "Aroha@B.co", password: "correct-pw" }),
    );

    expect(result?.error).toMatch(/verify your email/i);
    expect(result?.unverifiedEmail).toBe("aroha@b.co");
  });

  it("keeps the generic message when the password is simply wrong", async () => {
    signInMock.mockRejectedValueOnce(new AuthError("denied"));
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      name: "Aroha",
      image: null,
      role: "PUBLIC",
      password: "stored-hash",
      status: "ACTIVE",
      emailVerified: null,
    });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

    const result = await login(
      null,
      form({ email: "aroha@b.co", password: "wrong-pw" }),
    );

    expect(result).toEqual({ error: "Invalid email or password" });
  });

  it("does not re-hash on failed sign-ins to verified accounts", async () => {
    signInMock.mockRejectedValueOnce(new AuthError("denied"));
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      name: "Aroha",
      image: null,
      role: "PUBLIC",
      password: "stored-hash",
      status: "ACTIVE",
      emailVerified: new Date("2026-01-01"),
    });

    const result = await login(
      null,
      form({ email: "aroha@b.co", password: "wrong-pw" }),
    );

    expect(result).toEqual({ error: "Invalid email or password" });
    // The unverified disambiguation must not double the bcrypt cost of the
    // common failure case (signIn's own compare is behind the mock).
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("rate limits after 10 attempts, keyed by normalized email", async () => {
    signInMock.mockResolvedValue(undefined);
    for (let i = 0; i < 10; i++) {
      expect(
        await login(null, form({ email: "Busy@B.co", password: "pw" })),
      ).toBeNull();
    }

    // Blocked — and case variants share the same bucket.
    const blocked = await login(
      null,
      form({ email: "busy@b.co", password: "pw" }),
    );
    expect(blocked?.error).toMatch(/too many sign-in attempts/i);
    expect(signInMock).toHaveBeenCalledTimes(10);

    // A different account is unaffected.
    signInMock.mockResolvedValueOnce(undefined);
    expect(
      await login(null, form({ email: "other@b.co", password: "pw" })),
    ).toBeNull();
  });
});

describe("verifyEmail", () => {
  const INVALID = /expired or already been used/i;

  it("rejects an empty token", async () => {
    const result = await verifyEmail(null, form({ token: "" }));
    expect(result).toEqual({
      status: "error",
      message: expect.stringMatching(INVALID),
    });
    expect(tokenFindFirstMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown token", async () => {
    tokenFindFirstMock.mockResolvedValueOnce(null);
    const result = await verifyEmail(null, form({ token: "raw-token" }));
    expect(result?.status).toBe("error");
    expect(tokenFindFirstMock).toHaveBeenCalledWith({
      where: { token: sha256("raw-token") },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    tokenFindFirstMock.mockResolvedValueOnce({
      identifier: "email-verify:aroha@b.co",
      token: sha256("raw-token"),
      expires: new Date(Date.now() - 1000),
    });
    const result = await verifyEmail(null, form({ token: "raw-token" }));
    expect(result?.status).toBe("error");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects tokens that are not email-verification tokens", async () => {
    tokenFindFirstMock.mockResolvedValueOnce({
      identifier: "password-reset:aroha@b.co",
      token: sha256("raw-token"),
      expires: new Date(Date.now() + 60_000),
    });
    const result = await verifyEmail(null, form({ token: "raw-token" }));
    expect(result?.status).toBe("error");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects tokens for archived accounts and still burns them", async () => {
    tokenFindFirstMock.mockResolvedValueOnce({
      identifier: "email-verify:gone@b.co",
      token: sha256("raw-token"),
      expires: new Date(Date.now() + 60_000),
    });
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "gone@b.co",
      status: "ARCHIVED",
      emailVerified: null,
    });
    const result = await verifyEmail(null, form({ token: "raw-token" }));
    expect(result?.status).toBe("error");
    expect(updateMock).not.toHaveBeenCalled();
    // The link must not linger redeemable in case the account is restored.
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "email-verify:gone@b.co" },
    });
  });

  it("marks the account verified and burns the token on success", async () => {
    tokenFindFirstMock.mockResolvedValueOnce({
      identifier: "email-verify:aroha@b.co",
      token: sha256("raw-token"),
      expires: new Date(Date.now() + 60_000),
    });
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      status: "ACTIVE",
      emailVerified: null,
    });

    const result = await verifyEmail(null, form({ token: "raw-token" }));

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { emailVerified: expect.any(Date) },
    });
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "email-verify:aroha@b.co" },
    });
    expect(result).toEqual({ status: "success" });
  });

  it("treats an already-verified account as success without rewriting the date", async () => {
    tokenFindFirstMock.mockResolvedValueOnce({
      identifier: "email-verify:aroha@b.co",
      token: sha256("raw-token"),
      expires: new Date(Date.now() + 60_000),
    });
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      status: "ACTIVE",
      emailVerified: new Date("2026-01-01"),
    });

    const result = await verifyEmail(null, form({ token: "raw-token" }));

    expect(updateMock).not.toHaveBeenCalled();
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "email-verify:aroha@b.co" },
    });
    expect(result).toEqual({ status: "success" });
  });
});

describe("resendVerificationEmail", () => {
  const NEUTRAL = /if that address/i;

  it("rejects an invalid email", async () => {
    const result = await resendVerificationEmail(null, form({ email: "nope" }));
    expect(result?.error).toMatch(/email/i);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns the neutral message without sending when no account exists", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const result = await resendVerificationEmail(
      null,
      form({ email: "ghost@b.co" }),
    );
    expect(result?.success).toMatch(NEUTRAL);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("returns the neutral message without sending for archived accounts", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "gone@b.co",
      name: "Gone",
      status: "ARCHIVED",
      emailVerified: null,
    });
    const result = await resendVerificationEmail(
      null,
      form({ email: "gone@b.co" }),
    );
    expect(result?.success).toMatch(NEUTRAL);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("returns the neutral message without sending for already-verified accounts", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      name: "Aroha",
      status: "ACTIVE",
      emailVerified: new Date("2026-01-01"),
    });
    const result = await resendVerificationEmail(
      null,
      form({ email: "aroha@b.co" }),
    );
    expect(result?.success).toMatch(NEUTRAL);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends a fresh link to an unverified account", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      name: "Aroha",
      status: "ACTIVE",
      emailVerified: null,
    });

    const result = await resendVerificationEmail(
      null,
      form({ email: "Aroha@B.co" }),
    );

    expect(result?.success).toMatch(NEUTRAL);
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "email-verify:aroha@b.co" },
    });
    expect(tokenCreateMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const email = sendEmailMock.mock.calls[0][0] as { to: string; html: string };
    expect(email.to).toBe("aroha@b.co");
    expect(email.html).toMatch(/\/verify-email\?token=[0-9a-f]+/);
  });

  it("silently skips sending once the email is rate limited", async () => {
    findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "aroha@b.co",
      name: "Aroha",
      status: "ACTIVE",
      emailVerified: null,
    });

    for (let i = 0; i < 4; i++) {
      const result = await resendVerificationEmail(
        null,
        form({ email: "aroha@b.co" }),
      );
      // Still the neutral message - no oracle for how many requests exist.
      expect(result?.success).toMatch(NEUTRAL);
    }

    expect(sendEmailMock).toHaveBeenCalledTimes(3);
    expect(tokenCreateMock).toHaveBeenCalledTimes(3);
  });
});

describe("requestPasswordReset", () => {
  const NEUTRAL = /if an account exists/i;

  it("rejects an invalid email", async () => {
    const result = await requestPasswordReset(null, form({ email: "nope" }));
    expect(result?.error).toMatch(/email/i);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns the neutral message without sending when no account exists", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const result = await requestPasswordReset(
      null,
      form({ email: "ghost@b.co" }),
    );
    expect(result?.success).toMatch(NEUTRAL);
    expect(tokenCreateMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("returns the neutral message without sending for archived accounts", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "gone@b.co",
      name: "Gone",
      status: "ARCHIVED",
    });
    const result = await requestPasswordReset(
      null,
      form({ email: "gone@b.co" }),
    );
    expect(result?.success).toMatch(NEUTRAL);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("stores only a sha256 hash and emails a link with the raw token", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      name: "Aroha",
      status: "ACTIVE",
    });

    const result = await requestPasswordReset(
      null,
      form({ email: "Aroha@B.co" }),
    );
    expect(result?.success).toMatch(NEUTRAL);

    // Older outstanding links are replaced.
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "password-reset:aroha@b.co" },
    });

    expect(tokenCreateMock).toHaveBeenCalledTimes(1);
    const created = tokenCreateMock.mock.calls[0][0] as {
      data: { identifier: string; token: string; expires: Date };
    };
    expect(created.data.identifier).toBe("password-reset:aroha@b.co");
    expect(created.data.token).toMatch(/^[0-9a-f]{64}$/);
    const ttlMs = created.data.expires.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(59 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const email = sendEmailMock.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(email.to).toBe("aroha@b.co");
    expect(email.subject).toMatch(/password/i);

    // The emailed link carries the raw token; the DB only its hash.
    const match = email.html.match(/\/reset-password\?token=([0-9a-f]+)/);
    expect(match).not.toBeNull();
    const rawToken = match![1];
    expect(rawToken).not.toBe(created.data.token);
    expect(sha256(rawToken)).toBe(created.data.token);
    expect(email.text).toContain(`/reset-password?token=${rawToken}`);
  });

  it("silently skips sending once the email is rate limited", async () => {
    findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "aroha@b.co",
      name: "Aroha",
      status: "ACTIVE",
    });

    for (let i = 0; i < 4; i++) {
      const result = await requestPasswordReset(
        null,
        form({ email: "aroha@b.co" }),
      );
      // Still the neutral message — no oracle for how many requests exist.
      expect(result?.success).toMatch(NEUTRAL);
    }

    expect(sendEmailMock).toHaveBeenCalledTimes(3);
    expect(tokenCreateMock).toHaveBeenCalledTimes(3);
  });
});

describe("resetPassword", () => {
  const validFields = {
    token: "raw-token",
    password: "newpassword1",
    confirmPassword: "newpassword1",
  };

  it("rejects a password shorter than 8 characters", async () => {
    const result = await resetPassword(
      null,
      form({ ...validFields, password: "short", confirmPassword: "short" }),
    );
    expect(result?.error).toMatch(/8 characters/);
    expect(tokenFindFirstMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    const result = await resetPassword(
      null,
      form({ ...validFields, confirmPassword: "different1" }),
    );
    expect(result).toEqual({ error: "Passwords do not match" });
    expect(tokenFindFirstMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown token", async () => {
    tokenFindFirstMock.mockResolvedValueOnce(null);
    const result = await resetPassword(null, form(validFields));
    expect(result?.error).toMatch(/expired or already been used/i);
    expect(tokenFindFirstMock).toHaveBeenCalledWith({
      where: { token: sha256("raw-token") },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    tokenFindFirstMock.mockResolvedValueOnce({
      identifier: "password-reset:aroha@b.co",
      token: sha256("raw-token"),
      expires: new Date(Date.now() - 1000),
    });
    const result = await resetPassword(null, form(validFields));
    expect(result?.error).toMatch(/expired or already been used/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects tokens that are not password-reset tokens", async () => {
    tokenFindFirstMock.mockResolvedValueOnce({
      identifier: "aroha@b.co",
      token: sha256("raw-token"),
      expires: new Date(Date.now() + 60_000),
    });
    const result = await resetPassword(null, form(validFields));
    expect(result?.error).toMatch(/expired or already been used/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates the password and burns every outstanding token on success", async () => {
    tokenFindFirstMock.mockResolvedValueOnce({
      identifier: "password-reset:aroha@b.co",
      token: sha256("raw-token"),
      expires: new Date(Date.now() + 30 * 60 * 1000),
    });
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      status: "ACTIVE",
    });

    const result = await resetPassword(null, form(validFields));

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "aroha@b.co" },
    });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { password: "hashed:newpassword1" },
    });
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "password-reset:aroha@b.co" },
    });
    expect(result?.success).toMatch(/password has been reset/i);
  });
});
