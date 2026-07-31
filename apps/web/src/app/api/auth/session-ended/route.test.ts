import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const signOutMock = vi.fn();
const isSessionAccountActiveMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("@/lib/data/session-account", () => ({
  isSessionAccountActive: (...args: unknown[]) =>
    isSessionAccountActiveMock(...args),
}));

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
    isSessionAccountActiveMock.mockResolvedValue(false);

    await run();

    expect(signOutMock).toHaveBeenCalledWith({
      redirectTo: "/login?signed-out=account-removed",
    });
  });

  // A bare GET that ends a session is cross-site forgeable - an <img src> on
  // any page would sign out whoever loaded it. Re-reading the account means a
  // forged request against a live session changes nothing at all.
  describe("a live account is never signed out by this route", () => {
    beforeEach(() => {
      isSessionAccountActiveMock.mockResolvedValue(true);
    });

    it("bounces a volunteer to their own dashboard", async () => {
      authMock.mockResolvedValue({ user: { id: "u1", role: "VOLUNTEER" } });

      expect(await run()).toBe("/dashboard");
      expect(signOutMock).not.toHaveBeenCalled();
    });

    it.each(["COORDINATOR", "ADMIN"])("bounces %s to the staff dashboard", async (role) => {
      authMock.mockResolvedValue({ user: { id: "u1", role } });

      expect(await run()).toBe("/staff/dashboard");
      expect(signOutMock).not.toHaveBeenCalled();
    });
  });
});
