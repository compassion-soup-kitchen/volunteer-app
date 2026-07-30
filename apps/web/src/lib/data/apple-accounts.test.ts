import { beforeEach, describe, expect, it, vi } from "vitest";

const accountFindUnique = vi.fn();
const accountUpdate = vi.fn();
const userFindUnique = vi.fn();
const userCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    account: { findUnique: accountFindUnique, update: accountUpdate },
    user: { findUnique: userFindUnique, create: userCreate },
  }),
}));

import { signInWithAppleIdentity } from "./apple-accounts";

/** A first authorisation: Apple sends the address exactly once. */
const firstTime = {
  sub: "001234.abc",
  email: "  Aroha@Icloud.com ",
  isPrivateEmail: false,
};

/** Every sign-in after that: the subject, and nothing else. */
const returning = {
  sub: "001234.abc",
  email: null,
  isPrivateEmail: false,
};

const user = {
  id: "u1",
  email: "aroha@icloud.com",
  name: "Aroha",
  image: null,
  role: "VOLUNTEER" as const,
  status: "ACTIVE" as const,
};

const duplicate = () => Object.assign(new Error("dup"), { code: "P2002" });

beforeEach(() => {
  accountFindUnique.mockReset();
  accountUpdate.mockReset();
  userFindUnique.mockReset();
  userCreate.mockReset();
});

describe("signInWithAppleIdentity", () => {
  it("returns the user behind an already-linked Apple account", async () => {
    accountFindUnique.mockResolvedValueOnce({ id: "a1", refresh_token: null, user });

    const result = await signInWithAppleIdentity({ identity: returning });

    expect(result).toEqual({
      ok: true,
      created: false,
      user: {
        id: "u1",
        email: "aroha@icloud.com",
        name: "Aroha",
        image: null,
        role: "VOLUNTEER",
      },
    });
    expect(accountFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_providerAccountId: {
            provider: "apple",
            providerAccountId: "001234.abc",
          },
        },
      })
    );
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("locks out an archived account even with a valid Apple token", async () => {
    accountFindUnique.mockResolvedValueOnce({
      id: "a1",
      refresh_token: null,
      user: { ...user, status: "ARCHIVED" },
    });

    expect(await signInWithAppleIdentity({ identity: returning })).toEqual({
      ok: false,
      reason: "archived",
    });
  });

  // Adopting an unlinked address would hand over an account claimed by
  // someone else's password sign-up. The Google flow refuses this too.
  it("refuses to link onto an existing account with the same email", async () => {
    accountFindUnique.mockResolvedValueOnce(null);
    userFindUnique.mockResolvedValueOnce({ id: "u9" });

    expect(await signInWithAppleIdentity({ identity: firstTime })).toEqual({
      ok: false,
      reason: "not-linked",
    });
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("creates a pre-verified PUBLIC user with a linked account", async () => {
    accountFindUnique.mockResolvedValueOnce(null);
    userFindUnique.mockResolvedValueOnce(null);
    userCreate.mockResolvedValueOnce({ ...user, role: "PUBLIC" });

    const result = await signInWithAppleIdentity({
      identity: firstTime,
      fullName: "  Aroha Wīremu  ",
      refreshToken: "refresh-1",
    });

    expect(result).toMatchObject({ ok: true, created: true });
    const data = userCreate.mock.calls[0][0].data;
    // Normalized, or the same person can end up with two accounts.
    expect(data.email).toBe("aroha@icloud.com");
    expect(data.role).toBe("PUBLIC");
    expect(data.emailVerified).toBeInstanceOf(Date);
    expect(data.name).toBe("Aroha Wīremu");
    expect(data.accounts.create).toEqual({
      type: "oidc",
      provider: "apple",
      providerAccountId: "001234.abc",
      refresh_token: "refresh-1",
    });
  });

  it("stores no name when Apple withheld one", async () => {
    accountFindUnique.mockResolvedValueOnce(null);
    userFindUnique.mockResolvedValueOnce(null);
    userCreate.mockResolvedValueOnce({ ...user, role: "PUBLIC" });

    await signInWithAppleIdentity({ identity: firstTime, fullName: "   " });

    expect(userCreate.mock.calls[0][0].data.name).toBeNull();
  });

  // The signature of someone who deleted their account while Apple still
  // remembered the authorisation. There is genuinely nothing to build a
  // person from, so it must not be guessed at.
  it("refuses a returning identity it doesn't know and has no email for", async () => {
    accountFindUnique.mockResolvedValueOnce(null);

    expect(await signInWithAppleIdentity({ identity: returning })).toEqual({
      ok: false,
      reason: "no-email",
    });
    expect(userFindUnique).not.toHaveBeenCalled();
    expect(userCreate).not.toHaveBeenCalled();
  });

  describe("the stored refresh token", () => {
    it("is refreshed when Apple issues a newer one", async () => {
      accountFindUnique.mockResolvedValueOnce({
        id: "a1",
        refresh_token: "old",
        user,
      });

      await signInWithAppleIdentity({
        identity: returning,
        refreshToken: "new",
      });

      expect(accountUpdate).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { refresh_token: "new" },
      });
    });

    it("is left alone when this sign-in produced nothing new", async () => {
      accountFindUnique.mockResolvedValueOnce({
        id: "a1",
        refresh_token: "old",
        user,
      });

      await signInWithAppleIdentity({ identity: returning });

      expect(accountUpdate).not.toHaveBeenCalled();
    });

    // Rewriting the same value would be a pointless write on every sign-in.
    it("is left alone when it hasn't changed", async () => {
      accountFindUnique.mockResolvedValueOnce({
        id: "a1",
        refresh_token: "same",
        user,
      });

      await signInWithAppleIdentity({
        identity: returning,
        refreshToken: "same",
      });

      expect(accountUpdate).not.toHaveBeenCalled();
    });
  });

  // A double-tapped button can put two sign-ins in flight at once; the loser
  // of the create race re-reads what the winner wrote.
  it("retries once on a unique violation and returns the winner's row", async () => {
    accountFindUnique.mockResolvedValueOnce(null);
    userFindUnique.mockResolvedValueOnce(null);
    userCreate.mockRejectedValueOnce(duplicate());
    accountFindUnique.mockResolvedValueOnce({ id: "a1", refresh_token: null, user });

    expect(await signInWithAppleIdentity({ identity: firstTime })).toMatchObject({
      ok: true,
      created: false,
    });
  });

  it("gives up rather than looping when the retry also collides", async () => {
    accountFindUnique.mockResolvedValue(null);
    userFindUnique.mockResolvedValue(null);
    userCreate.mockRejectedValue(duplicate());

    await expect(
      signInWithAppleIdentity({ identity: firstTime })
    ).rejects.toThrow("dup");
    expect(userCreate).toHaveBeenCalledTimes(2);
  });
});
