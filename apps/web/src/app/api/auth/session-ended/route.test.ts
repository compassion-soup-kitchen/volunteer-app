import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const signOutMock = vi.fn();
const userFindManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

// The real `loadSessionAccess` over a stubbed table - which account gets
// checked is the thing under test here, so stubbing the check itself would
// hide the bug it exists to prevent.
vi.mock("@/lib/db", () => ({
  getDb: () => ({ user: { findMany: userFindManyMock } }),
}));

/** The accounts the database holds, as `findMany` would return them. */
function accounts(
  ...rows: { id: string; role?: string; status?: string; sessionVersion?: number }[]
) {
  userFindManyMock.mockImplementation(async ({ where }) =>
    rows
      .filter((r) => where.id.in.includes(r.id))
      .map((r) => ({
        role: "VOLUNTEER",
        status: "ACTIVE",
        sessionVersion: 0,
        ...r,
      }))
  );
}

/** The ids asked about. */
function askedAbout(): string[] {
  return userFindManyMock.mock.calls[0][0].where.id.in;
}

/** `redirect` throws to unwind the handler; the sentinel carries the target. */
class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect:${to}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));

import { GET } from "./route";

/** Runs the handler and reports where it sent the caller, if anywhere. */
async function run(): Promise<string | null> {
  try {
    await GET();
    return null;
  } catch (e) {
    if (e instanceof Redirected) return e.to;
    throw e;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/session-ended", () => {
  it("sends a caller with no session to sign in", async () => {
    authMock.mockResolvedValue(null);

    expect(await run()).toBe("/login");
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("clears the session when the account really is gone", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "VOLUNTEER" } });
    accounts();

    await run();

    expect(signOutMock).toHaveBeenCalledWith({
      redirectTo: "/login?signed-out=account-removed",
    });
  });

  // A bare GET that ends a session is cross-site forgeable - an <img src> on
  // any page would sign out whoever loaded it. Re-reading the account means a
  // forged request against a live session changes nothing at all.
  describe("a live account is never signed out by this route", () => {
    it("bounces a volunteer to their own dashboard", async () => {
      authMock.mockResolvedValue({ user: { id: "u1", role: "VOLUNTEER" } });
      accounts({ id: "u1" });

      expect(await run()).toBe("/dashboard");
      expect(signOutMock).not.toHaveBeenCalled();
    });

    it.each(["COORDINATOR", "ADMIN"])("bounces %s to the staff dashboard", async (role) => {
      authMock.mockResolvedValue({ user: { id: "u1", role } });
      accounts({ id: "u1", role });

      expect(await run()).toBe("/staff/dashboard");
      expect(signOutMock).not.toHaveBeenCalled();
    });

    // Where to bounce is the live role's call: the token's may be stale.
    it("bounces by the database's role, not the token's", async () => {
      authMock.mockResolvedValue({ user: { id: "u1", role: "COORDINATOR" } });
      accounts({ id: "u1", role: "VOLUNTEER" });

      expect(await run()).toBe("/dashboard");
    });
  });

  // A password change or reset bumps the version; this is where a session
  // minted before it is put to rest.
  it("clears a session minted on an earlier version", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", role: "VOLUNTEER", sessionVersion: 0 },
    });
    accounts({ id: "u1", sessionVersion: 1 });

    await run();

    expect(signOutMock).toHaveBeenCalled();
  });

  // The session belongs to the admin even though it presents as the target.
  // Signing out because the *borrowed* identity was deleted would clear
  // `token.impersonator` and strand the admin outside their own account.
  describe("impersonation", () => {
    const impersonating = {
      user: { id: "target-1", role: "VOLUNTEER", impersonator: { id: "admin-9" } },
    };

    it("keeps the admin signed in when the impersonated account is gone", async () => {
      authMock.mockResolvedValue(impersonating);
      // The admin is still here; the target has been deleted.
      accounts({ id: "admin-9", role: "ADMIN" });

      const to = await run();

      expect(askedAbout()).toContain("admin-9");
      expect(signOutMock).not.toHaveBeenCalled();
      // Back to the target's own area, where the banner offers the way out.
      expect(to).toBe("/dashboard");
    });

    it("still signs out when the admin's own account has gone", async () => {
      authMock.mockResolvedValue(impersonating);
      accounts({ id: "target-1" });

      await run();

      expect(askedAbout()).toContain("admin-9");
      expect(signOutMock).toHaveBeenCalled();
    });
  });
});
