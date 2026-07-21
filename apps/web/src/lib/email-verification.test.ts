import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.fn();
const userUpdateMock = vi.fn();
const tokenFindFirstMock = vi.fn();
const tokenCreateMock = vi.fn();
const tokenDeleteManyMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    user: {
      findUnique: userFindUniqueMock,
      update: userUpdateMock,
    },
    verificationToken: {
      findFirst: tokenFindFirstMock,
      create: tokenCreateMock,
      deleteMany: tokenDeleteManyMock,
    },
  }),
}));

// Keep the real HTML/text builders so tests can pull the link out of the
// rendered email; only the actual send is mocked.
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  };
});

import {
  consumeVerificationToken,
  sendVerificationEmail,
  VERIFICATION_IDENTIFIER_PREFIX,
  VERIFICATION_TOKEN_TTL_MS,
} from "./email-verification";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

beforeEach(() => {
  userFindUniqueMock.mockReset();
  userUpdateMock.mockReset();
  tokenFindFirstMock.mockReset();
  tokenCreateMock.mockReset();
  tokenDeleteManyMock.mockReset();
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue({ ok: true, id: "email_1" });
});

describe("sendVerificationEmail", () => {
  it("replaces any outstanding token before storing the new hash", async () => {
    await sendVerificationEmail("aroha@b.co", "Aroha");

    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "email-verify:aroha@b.co" },
    });
    expect(tokenCreateMock).toHaveBeenCalledTimes(1);

    // One outstanding link per person: the delete must land before the create.
    expect(tokenDeleteManyMock.mock.invocationCallOrder[0]).toBeLessThan(
      tokenCreateMock.mock.invocationCallOrder[0],
    );

    const created = tokenCreateMock.mock.calls[0][0] as {
      data: { identifier: string; token: string; expires: Date };
    };
    expect(created.data.identifier).toBe(
      `${VERIFICATION_IDENTIFIER_PREFIX}aroha@b.co`,
    );
    // Only a sha256 hash is stored, with the 24h TTL.
    expect(created.data.token).toMatch(/^[0-9a-f]{64}$/);
    const ttlMs = created.data.expires.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(VERIFICATION_TOKEN_TTL_MS - 60_000);
    expect(ttlMs).toBeLessThanOrEqual(VERIFICATION_TOKEN_TTL_MS);
  });

  it("emails the raw token while the DB only ever sees its hash", async () => {
    await sendVerificationEmail("aroha@b.co", "Aroha");

    const stored = (
      tokenCreateMock.mock.calls[0][0] as { data: { token: string } }
    ).data.token;

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const email = sendEmailMock.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(email.to).toBe("aroha@b.co");
    expect(email.subject).toMatch(/confirm your email/i);

    const match = email.html.match(/\/verify-email\?token=([0-9a-f]+)/);
    expect(match).not.toBeNull();
    const rawToken = match![1];
    expect(rawToken).not.toBe(stored);
    expect(sha256(rawToken)).toBe(stored);
    expect(email.text).toContain(`/verify-email?token=${rawToken}`);
  });

  it("passes the send result through to the caller", async () => {
    sendEmailMock.mockResolvedValueOnce({ ok: false, skipped: true });
    const result = await sendVerificationEmail("aroha@b.co", null);
    expect(result).toEqual({ ok: false, skipped: true });
  });
});

describe("consumeVerificationToken", () => {
  const validRecord = {
    identifier: "email-verify:aroha@b.co",
    token: sha256("raw-token"),
    expires: new Date(Date.now() + 60_000),
  };

  it("looks the token up by its hash and rejects unknown tokens", async () => {
    tokenFindFirstMock.mockResolvedValueOnce(null);

    expect(await consumeVerificationToken("raw-token")).toBe(false);
    expect(tokenFindFirstMock).toHaveBeenCalledWith({
      where: { token: sha256("raw-token") },
    });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("leaves foreign-prefix tokens alone instead of burning them", async () => {
    tokenFindFirstMock.mockResolvedValueOnce({
      ...validRecord,
      identifier: "password-reset:aroha@b.co",
    });

    expect(await consumeVerificationToken("raw-token")).toBe(false);
    // A password-reset token is not ours to consume or delete.
    expect(tokenDeleteManyMock).not.toHaveBeenCalled();
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects expired tokens", async () => {
    tokenFindFirstMock.mockResolvedValueOnce({
      ...validRecord,
      expires: new Date(Date.now() - 1000),
    });

    expect(await consumeVerificationToken("raw-token")).toBe(false);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("burns orphaned tokens whose account no longer exists", async () => {
    tokenFindFirstMock.mockResolvedValueOnce(validRecord);
    userFindUniqueMock.mockResolvedValueOnce(null);

    expect(await consumeVerificationToken("raw-token")).toBe(false);
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "email-verify:aroha@b.co" },
    });
  });

  it("burns tokens for archived accounts without verifying them", async () => {
    tokenFindFirstMock.mockResolvedValueOnce(validRecord);
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      status: "ARCHIVED",
      emailVerified: null,
    });

    expect(await consumeVerificationToken("raw-token")).toBe(false);
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "email-verify:aroha@b.co" },
    });
  });

  it("marks the account verified and burns the token on success", async () => {
    tokenFindFirstMock.mockResolvedValueOnce(validRecord);
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      status: "ACTIVE",
      emailVerified: null,
    });

    expect(await consumeVerificationToken("raw-token")).toBe(true);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { emailVerified: expect.any(Date) },
    });
    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "email-verify:aroha@b.co" },
    });
  });

  it("succeeds for an already-verified account without rewriting the date", async () => {
    tokenFindFirstMock.mockResolvedValueOnce(validRecord);
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "aroha@b.co",
      status: "ACTIVE",
      emailVerified: new Date("2026-01-01"),
    });

    expect(await consumeVerificationToken("raw-token")).toBe(true);
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(tokenDeleteManyMock).toHaveBeenCalledTimes(1);
  });
});
