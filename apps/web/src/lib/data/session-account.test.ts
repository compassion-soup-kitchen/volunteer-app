import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({ user: { findUnique: userFindUnique } }),
}));

import { isSessionAccountActive } from "./session-account";

/**
 * Small, but it is now the only thing keeping a deleted or archived account
 * off every staff and volunteer page *and* out of every Server Action, so the
 * three answers it can give are worth pinning down. Getting the missing-user
 * case wrong would silently re-open the hole this was written to close.
 */
beforeEach(() => {
  userFindUnique.mockReset();
});

describe("isSessionAccountActive", () => {
  it("lets an active account through", async () => {
    userFindUnique.mockResolvedValueOnce({ status: "ACTIVE" });
    expect(await isSessionAccountActive("u1")).toBe(true);
  });

  it("refuses an archived account", async () => {
    userFindUnique.mockResolvedValueOnce({ status: "ARCHIVED" });
    expect(await isSessionAccountActive("u1")).toBe(false);
  });

  // Missing means deleted - by an admin, or by the person themselves. This is
  // the case the whole check exists for: the JWT still names them.
  it("refuses an account that no longer exists", async () => {
    userFindUnique.mockResolvedValueOnce(null);
    expect(await isSessionAccountActive("u1")).toBe(false);
  });

  it("asks only for the status, scoped to that id", async () => {
    userFindUnique.mockResolvedValueOnce({ status: "ACTIVE" });

    await isSessionAccountActive("u1");

    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { status: true },
    });
  });
});
