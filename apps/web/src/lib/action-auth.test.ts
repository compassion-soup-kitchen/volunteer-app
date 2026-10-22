import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const loadSessionAccessMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/data/session-account", () => ({
  loadSessionAccess: (...args: unknown[]) => loadSessionAccessMock(...args),
}));

import { requireActiveSession, requireStaffSession } from "./action-auth";

const coordinatorToken = () => ({
  user: { id: "u1", role: "COORDINATOR" },
});

beforeEach(() => {
  authMock.mockReset();
  loadSessionAccessMock.mockReset();
});

describe("requireActiveSession", () => {
  it("returns nothing when signed out, without reading", async () => {
    authMock.mockResolvedValue(null);

    expect(await requireActiveSession()).toBeNull();
    expect(loadSessionAccessMock).not.toHaveBeenCalled();
  });

  it("refuses a session that may not act", async () => {
    authMock.mockResolvedValue(coordinatorToken());
    loadSessionAccessMock.mockResolvedValue({
      alive: true,
      canAct: false,
      role: "COORDINATOR",
    });

    expect(await requireActiveSession()).toBeNull();
  });

  // The token's role is a snapshot from sign-in; every role check downstream
  // reads `session.user.role`, so it must be the live one.
  it("replaces the token's role with the database's", async () => {
    authMock.mockResolvedValue(coordinatorToken());
    loadSessionAccessMock.mockResolvedValue({
      alive: true,
      canAct: true,
      role: "VOLUNTEER",
    });

    expect((await requireActiveSession())?.user.role).toBe("VOLUNTEER");
  });
});

describe("requireStaffSession", () => {
  // A coordinator demoted mid-session kept every staff power while their
  // token still said COORDINATOR.
  it("refuses a coordinator who has since been demoted", async () => {
    authMock.mockResolvedValue(coordinatorToken());
    loadSessionAccessMock.mockResolvedValue({
      alive: true,
      canAct: true,
      role: "VOLUNTEER",
    });

    expect(await requireStaffSession()).toBeNull();
  });

  it("admits someone promoted since signing in", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "VOLUNTEER" } });
    loadSessionAccessMock.mockResolvedValue({
      alive: true,
      canAct: true,
      role: "COORDINATOR",
    });

    expect((await requireStaffSession())?.user.role).toBe("COORDINATOR");
  });
});
