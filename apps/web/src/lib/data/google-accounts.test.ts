import { beforeEach, describe, expect, it, vi } from "vitest";

const accountFindUnique = vi.fn();
const userFindUnique = vi.fn();
const userCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    account: { findUnique: accountFindUnique },
    user: { findUnique: userFindUnique, create: userCreate },
  }),
}));

import { signInWithGoogleIdentity } from "./google-accounts";

const identity = {
  sub: "google-123",
  email: "  Aroha@Gmail.com ",
  name: "Aroha",
  picture: "https://lh3.googleusercontent.com/a/aroha",
};

const user = {
  id: "u1",
  email: "aroha@gmail.com",
  name: "Aroha",
  image: null,
  role: "VOLUNTEER" as const,
  status: "ACTIVE" as const,
};

const duplicate = () => Object.assign(new Error("dup"), { code: "P2002" });

beforeEach(() => {
  accountFindUnique.mockReset();
  userFindUnique.mockReset();
  userCreate.mockReset();
});

describe("signInWithGoogleIdentity", () => {
  it("returns the user behind an already-linked Google account", async () => {
    accountFindUnique.mockResolvedValueOnce({ user });

    const result = await signInWithGoogleIdentity(identity);

    expect(result).toEqual({
      ok: true,
      created: false,
      user: {
        id: "u1",
        email: "aroha@gmail.com",
        name: "Aroha",
        image: null,
        role: "VOLUNTEER",
      },
    });
    expect(accountFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: "google-123",
          },
        },
      })
    );
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("locks out an archived account even with a valid Google token", async () => {
    accountFindUnique.mockResolvedValueOnce({
      user: { ...user, status: "ARCHIVED" },
    });

    expect(await signInWithGoogleIdentity(identity)).toEqual({
      ok: false,
      reason: "archived",
    });
  });

  // Adopting an unlinked address would hand over an account claimed by
  // someone else's password sign-up. The web flow refuses this too.
  it("refuses to link onto an existing account with the same email", async () => {
    accountFindUnique.mockResolvedValueOnce(null);
    userFindUnique.mockResolvedValueOnce({ id: "u9" });

    expect(await signInWithGoogleIdentity(identity)).toEqual({
      ok: false,
      reason: "not-linked",
    });
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("creates a pre-verified PUBLIC user with a linked account", async () => {
    accountFindUnique.mockResolvedValueOnce(null);
    userFindUnique.mockResolvedValueOnce(null);
    userCreate.mockResolvedValueOnce({ ...user, role: "PUBLIC" });

    const result = await signInWithGoogleIdentity(identity);

    expect(result).toMatchObject({ ok: true, created: true });
    const data = userCreate.mock.calls[0][0].data;
    // Normalized, or the same person can end up with two accounts.
    expect(data.email).toBe("aroha@gmail.com");
    expect(data.role).toBe("PUBLIC");
    expect(data.emailVerified).toBeInstanceOf(Date);
    expect(data.accounts.create).toEqual({
      type: "oidc",
      provider: "google",
      providerAccountId: "google-123",
    });
  });

  it("looks the existing user up by normalized email", async () => {
    accountFindUnique.mockResolvedValueOnce(null);
    userFindUnique.mockResolvedValueOnce({ id: "u9" });

    await signInWithGoogleIdentity(identity);

    expect(userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "aroha@gmail.com" } })
    );
  });

  it("re-reads the winner's row when two sign-ins race to create", async () => {
    accountFindUnique.mockResolvedValueOnce(null);
    userFindUnique.mockResolvedValueOnce(null);
    userCreate.mockRejectedValueOnce(duplicate());
    accountFindUnique.mockResolvedValueOnce({ user });

    expect(await signInWithGoogleIdentity(identity)).toMatchObject({
      ok: true,
      created: false,
    });
    expect(userCreate).toHaveBeenCalledTimes(1);
  });

  it("gives up rather than looping when the retry also collides", async () => {
    accountFindUnique.mockResolvedValue(null);
    userFindUnique.mockResolvedValue(null);
    userCreate.mockRejectedValue(duplicate());

    await expect(signInWithGoogleIdentity(identity)).rejects.toThrow("dup");
    expect(userCreate).toHaveBeenCalledTimes(2);
  });
});
