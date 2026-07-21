import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    user: {
      findUnique: findUniqueMock,
    },
  }),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
    compare: vi.fn(),
  },
}));

import bcrypt from "bcryptjs";
import {
  checkCredentials,
  isUnverifiedCredentialsAccount,
  normalizeEmail,
  verifyCredentials,
} from "./users";

const activeUser = {
  id: "u1",
  email: "aroha@b.co",
  name: "Aroha",
  image: null,
  role: "VOLUNTEER",
  password: "stored-hash",
  status: "ACTIVE",
  emailVerified: new Date("2026-01-01"),
};

beforeEach(() => {
  findUniqueMock.mockReset();
  vi.mocked(bcrypt.compare).mockReset();
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Aroha@B.Co ")).toBe("aroha@b.co");
  });
});

describe("checkCredentials", () => {
  it("looks the user up by normalized email", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    await checkCredentials("  Aroha@B.Co ", "pw");
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "aroha@b.co" },
    });
  });

  it("returns invalid-credentials for an unknown email", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    expect(await checkCredentials("ghost@b.co", "pw")).toEqual({
      ok: false,
      reason: "invalid-credentials",
    });
  });

  it("returns invalid-credentials for an OAuth-only account with no password", async () => {
    findUniqueMock.mockResolvedValueOnce({ ...activeUser, password: null });
    expect(await checkCredentials("aroha@b.co", "pw")).toEqual({
      ok: false,
      reason: "invalid-credentials",
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("returns archived for archived accounts before comparing passwords", async () => {
    findUniqueMock.mockResolvedValueOnce({ ...activeUser, status: "ARCHIVED" });
    expect(await checkCredentials("aroha@b.co", "pw")).toEqual({
      ok: false,
      reason: "archived",
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("returns invalid-credentials for a wrong password", async () => {
    findUniqueMock.mockResolvedValueOnce(activeUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
    expect(await checkCredentials("aroha@b.co", "wrong")).toEqual({
      ok: false,
      reason: "invalid-credentials",
    });
  });

  it("only reveals email-unverified after the password matches", async () => {
    findUniqueMock.mockResolvedValue({ ...activeUser, emailVerified: null });

    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
    expect(await checkCredentials("aroha@b.co", "wrong")).toEqual({
      ok: false,
      reason: "invalid-credentials",
    });

    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    expect(await checkCredentials("aroha@b.co", "right")).toEqual({
      ok: false,
      reason: "email-unverified",
    });
  });

  it("returns the session shape for a valid, verified account", async () => {
    findUniqueMock.mockResolvedValueOnce(activeUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    expect(await checkCredentials("aroha@b.co", "right")).toEqual({
      ok: true,
      user: {
        id: "u1",
        email: "aroha@b.co",
        name: "Aroha",
        image: null,
        role: "VOLUNTEER",
      },
    });
  });
});

describe("isUnverifiedCredentialsAccount", () => {
  it("is false for unknown emails without comparing", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    expect(await isUnverifiedCredentialsAccount("ghost@b.co", "pw")).toBe(false);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("is false for verified accounts without comparing, so failed logins don't pay a second hash", async () => {
    findUniqueMock.mockResolvedValueOnce(activeUser);
    expect(await isUnverifiedCredentialsAccount("aroha@b.co", "pw")).toBe(false);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("is false for archived accounts without comparing", async () => {
    findUniqueMock.mockResolvedValueOnce({
      ...activeUser,
      status: "ARCHIVED",
      emailVerified: null,
    });
    expect(await isUnverifiedCredentialsAccount("aroha@b.co", "pw")).toBe(false);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("only reports an unverified account when the password matches", async () => {
    findUniqueMock.mockResolvedValue({ ...activeUser, emailVerified: null });

    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
    expect(await isUnverifiedCredentialsAccount("aroha@b.co", "wrong")).toBe(
      false,
    );

    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    expect(await isUnverifiedCredentialsAccount("aroha@b.co", "right")).toBe(
      true,
    );
  });
});

describe("verifyCredentials", () => {
  it("returns the user when the check passes", async () => {
    findUniqueMock.mockResolvedValueOnce(activeUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    expect(await verifyCredentials("aroha@b.co", "right")).toMatchObject({
      id: "u1",
    });
  });

  it("returns null for unverified accounts, blocking sign-in everywhere", async () => {
    findUniqueMock.mockResolvedValueOnce({ ...activeUser, emailVerified: null });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    expect(await verifyCredentials("aroha@b.co", "right")).toBeNull();
  });
});
