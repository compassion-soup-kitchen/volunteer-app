import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const userFindUniqueMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

// The account-liveness re-read that every Server Action now does (see
// `action-auth.ts`). Stubbed active here so these tests keep exercising the
// auth gate itself; `session-account.test.ts` covers the check.
vi.mock("@/lib/data/session-account", () => ({
  isSessionAccountActive: () => Promise.resolve(true),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    user: { findUnique: userFindUniqueMock },
  }),
}));

import { startImpersonation, stopImpersonation } from "./impersonation-actions";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };

beforeEach(() => {
  authMock.mockReset();
  userFindUniqueMock.mockReset();
  revalidatePathMock.mockReset();
});

describe("startImpersonation", () => {
  it("returns ok for an admin targeting an active non-admin", async () => {
    authMock.mockResolvedValue(adminSession);
    userFindUniqueMock.mockResolvedValue({ role: "VOLUNTEER", status: "ACTIVE" });

    const result = await startImpersonation("vol-1");

    expect(result).toEqual({ ok: true });
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "vol-1" },
      select: { role: true, status: true },
    });
  });

  it("refuses a non-admin session without hitting the database", async () => {
    authMock.mockResolvedValue({ user: { id: "vol-2", role: "VOLUNTEER" } });

    const result = await startImpersonation("vol-1");

    expect(result).toEqual({
      error: "Only admins can view the app as another person.",
    });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("refuses an unauthenticated caller", async () => {
    authMock.mockResolvedValue(null);

    const result = await startImpersonation("vol-1");

    expect(result).toEqual({
      error: "Only admins can view the app as another person.",
    });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("refuses an already-impersonating admin before the role check", async () => {
    authMock.mockResolvedValue({
      user: { id: "admin-1", role: "VOLUNTEER", impersonator: { id: "admin-1" } },
    });

    const result = await startImpersonation("vol-1");

    expect(result).toEqual({
      error: "Return to your own account before impersonating someone else.",
    });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("refuses self-impersonation without hitting the database", async () => {
    authMock.mockResolvedValue(adminSession);

    const result = await startImpersonation("admin-1");

    expect(result).toEqual({ error: "You can't impersonate yourself." });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("refuses a missing target", async () => {
    authMock.mockResolvedValue(adminSession);
    userFindUniqueMock.mockResolvedValue(null);

    const result = await startImpersonation("ghost");

    expect(result).toEqual({ error: "That person's account no longer exists." });
  });

  it("refuses an archived target", async () => {
    authMock.mockResolvedValue(adminSession);
    userFindUniqueMock.mockResolvedValue({ role: "VOLUNTEER", status: "ARCHIVED" });

    const result = await startImpersonation("vol-1");

    expect(result).toEqual({
      error: "You can't impersonate an archived account.",
    });
  });

  it("refuses an admin target", async () => {
    authMock.mockResolvedValue(adminSession);
    userFindUniqueMock.mockResolvedValue({ role: "ADMIN", status: "ACTIVE" });

    const result = await startImpersonation("admin-2");

    expect(result).toEqual({ error: "You can't impersonate another admin." });
  });
});

describe("stopImpersonation", () => {
  it("revalidates the layout for an authenticated session", async () => {
    authMock.mockResolvedValue(adminSession);

    await stopImpersonation();

    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("no-ops without a session", async () => {
    authMock.mockResolvedValue(null);

    await stopImpersonation();

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
