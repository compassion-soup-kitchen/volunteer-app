import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({ user: { findMany: userFindMany } }),
}));

import {
  decideSessionAccess,
  homeForRole,
  loadSessionAccess,
  sessionOwnerId,
  type SessionAccountRow,
} from "./session-account";

/**
 * Small, but it is now the only thing keeping a deleted or archived account
 * off every staff and volunteer page *and* out of every Server Action, so the
 * three answers it can give are worth pinning down. Getting the missing-user
 * case wrong would silently re-open the hole this was written to close.
 */
beforeEach(() => {
  userFindMany.mockReset();
});

const row = (overrides: Partial<SessionAccountRow> = {}): SessionAccountRow => ({
  id: "u1",
  status: "ACTIVE",
  role: "VOLUNTEER",
  sessionVersion: 0,
  ...overrides,
});

describe("decideSessionAccess", () => {
  const own = (owner: SessionAccountRow | null, tokenVersion = 0) =>
    decideSessionAccess({
      tokenRole: "COORDINATOR",
      tokenVersion,
      impersonating: false,
      owner,
      effective: owner,
    });

  it("lets an active account on the token's version through", () => {
    expect(own(row())).toEqual({ alive: true, canAct: true, role: "VOLUNTEER" });
  });

  it("refuses an archived account", () => {
    expect(own(row({ status: "ARCHIVED" }))).toMatchObject({
      alive: false,
      canAct: false,
    });
  });

  // Missing means deleted - by an admin, or by the person themselves. The JWT
  // still names them.
  it("refuses an account that no longer exists", () => {
    expect(own(null)).toMatchObject({ alive: false, canAct: false });
  });

  // A password change, a reset or an archive bumps the version; a session
  // minted before it - possibly a stolen one - must stop working.
  it("refuses a session minted on an earlier version", () => {
    expect(own(row({ sessionVersion: 2 }), 1)).toMatchObject({
      alive: false,
      canAct: false,
    });
  });

  // The hole this closes: the token said COORDINATOR long after an admin
  // demoted them, and every gate believed it.
  it("reports the database's role, not the token's", () => {
    expect(own(row({ role: "VOLUNTEER" })).role).toBe("VOLUNTEER");
    expect(own(row({ role: "ADMIN" })).role).toBe("ADMIN");
  });

  describe("while impersonating", () => {
    const admin = row({ id: "admin-9", role: "ADMIN", sessionVersion: 3 });
    const target = row({ id: "target-1", role: "VOLUNTEER" });
    const borrowed = (
      owner: SessionAccountRow | null,
      effective: SessionAccountRow | null
    ) =>
      decideSessionAccess({
        tokenRole: "VOLUNTEER",
        tokenVersion: 3,
        impersonating: true,
        owner,
        effective,
      });

    it("acts as the target, on the admin's version", () => {
      expect(borrowed(admin, target)).toEqual({
        alive: true,
        canAct: true,
        role: "VOLUNTEER",
      });
    });

    // An admin archived or demoted mid-impersonation kept acting as whoever
    // they had borrowed: the target was active, and only the target was asked.
    it("ends when the admin has since been archived", () => {
      expect(borrowed({ ...admin, status: "ARCHIVED" }, target)).toMatchObject({
        alive: false,
        canAct: false,
      });
    });

    it("ends when the admin is no longer an admin", () => {
      expect(borrowed({ ...admin, role: "COORDINATOR" }, target)).toMatchObject(
        { alive: false, canAct: false }
      );
    });

    // Deleting the impersonated person mustn't sign the admin out - they need
    // the banner to climb back out - but nothing may be done as a deleted
    // person.
    it("stays signed in, read-only, when the target was deleted", () => {
      expect(borrowed(admin, null)).toEqual({
        alive: true,
        canAct: false,
        role: "VOLUNTEER",
      });
    });

    it("can't act as an archived target", () => {
      expect(
        borrowed(admin, { ...target, status: "ARCHIVED" })
      ).toMatchObject({ alive: true, canAct: false });
    });
  });
});

describe("loadSessionAccess", () => {
  it("reads one row when nobody is impersonating", async () => {
    userFindMany.mockResolvedValueOnce([row({ role: "ADMIN" })]);

    const access = await loadSessionAccess({ id: "u1", role: "VOLUNTEER" });

    expect(access).toEqual({ alive: true, canAct: true, role: "ADMIN" });
    expect(userFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["u1"] } },
      select: { id: true, status: true, role: true, sessionVersion: true },
    });
  });

  it("reads the admin and the target while impersonating", async () => {
    userFindMany.mockResolvedValueOnce([
      row({ id: "admin-9", role: "ADMIN" }),
      row({ id: "target-1" }),
    ]);

    const access = await loadSessionAccess({
      id: "target-1",
      role: "VOLUNTEER",
      impersonator: { id: "admin-9" },
    });

    expect(access).toEqual({ alive: true, canAct: true, role: "VOLUNTEER" });
    expect(userFindMany.mock.calls[0][0].where).toEqual({
      id: { in: ["admin-9", "target-1"] },
    });
  });

  // Sessions minted before versions existed carry none; the deploy itself
  // must not sign everyone out.
  it("treats a token with no version as version 0", async () => {
    userFindMany.mockResolvedValueOnce([row()]);
    expect(
      (await loadSessionAccess({ id: "u1", role: "VOLUNTEER" })).alive
    ).toBe(true);
  });

  it("refuses a token behind the account's version", async () => {
    userFindMany.mockResolvedValueOnce([row({ sessionVersion: 1 })]);
    expect(
      (
        await loadSessionAccess({ id: "u1", role: "VOLUNTEER", sessionVersion: 0 })
      ).alive
    ).toBe(false);
  });
});

describe("homeForRole", () => {
  it("sends staff to the staff dashboard and everyone else home", () => {
    expect(homeForRole("ADMIN")).toBe("/staff/dashboard");
    expect(homeForRole("COORDINATOR")).toBe("/staff/dashboard");
    expect(homeForRole("VOLUNTEER")).toBe("/dashboard");
    expect(homeForRole("PUBLIC")).toBe("/dashboard");
  });
});

describe("sessionOwnerId", () => {
  it("is the person themselves when nobody is impersonating", () => {
    expect(sessionOwnerId({ id: "u1" })).toBe("u1");
  });

  it("treats a null impersonator as nobody impersonating", () => {
    expect(sessionOwnerId({ id: "u1", impersonator: null })).toBe("u1");
  });

  // The bug this exists to prevent: asking about the borrowed identity would
  // sign the *admin* out of their own session the moment the person they were
  // impersonating got deleted - taking `token.impersonator`, and so the way
  // back, with it.
  it("is the admin, not the borrowed identity, while impersonating", () => {
    expect(
      sessionOwnerId({ id: "target-1", impersonator: { id: "admin-9" } })
    ).toBe("admin-9");
  });
});
