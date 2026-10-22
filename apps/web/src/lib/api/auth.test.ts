import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const verifyApiTokenMock = vi.fn();
const userFindUniqueMock = vi.fn();

vi.mock("./token", () => ({
  verifyApiToken: (...args: unknown[]) => verifyApiTokenMock(...args),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({ user: { findUnique: userFindUniqueMock } }),
}));

import { authenticateApiRequest } from "./auth";

function request(authorization?: string): NextRequest {
  return {
    headers: new Headers(authorization ? { authorization } : {}),
  } as unknown as NextRequest;
}

const account = {
  id: "u1",
  name: "Aroha",
  email: "aroha@b.co",
  image: null,
  role: "VOLUNTEER",
  status: "ACTIVE",
  sessionVersion: 2,
};

beforeEach(() => {
  verifyApiTokenMock.mockReset();
  userFindUniqueMock.mockReset();
});

describe("authenticateApiRequest", () => {
  it("resolves a token on the account's current version", async () => {
    verifyApiTokenMock.mockResolvedValue({ userId: "u1", sessionVersion: 2 });
    userFindUniqueMock.mockResolvedValue(account);

    expect(await authenticateApiRequest(request("Bearer t"))).toEqual({
      id: "u1",
      name: "Aroha",
      email: "aroha@b.co",
      image: null,
      role: "VOLUNTEER",
    });
  });

  // A password change or reset bumps the version. Before, a token copied off
  // a lost phone kept working for its full 30 days regardless.
  it("refuses a token minted before a password change or reset", async () => {
    verifyApiTokenMock.mockResolvedValue({ userId: "u1", sessionVersion: 1 });
    userFindUniqueMock.mockResolvedValue(account);

    expect(await authenticateApiRequest(request("Bearer t"))).toBeNull();
  });

  it("refuses an archived account", async () => {
    verifyApiTokenMock.mockResolvedValue({ userId: "u1", sessionVersion: 2 });
    userFindUniqueMock.mockResolvedValue({ ...account, status: "ARCHIVED" });

    expect(await authenticateApiRequest(request("Bearer t"))).toBeNull();
  });

  it("refuses a missing or malformed header without reading", async () => {
    expect(await authenticateApiRequest(request())).toBeNull();
    expect(await authenticateApiRequest(request("Basic abc"))).toBeNull();
    expect(verifyApiTokenMock).not.toHaveBeenCalled();
  });

  it("refuses an invalid token", async () => {
    verifyApiTokenMock.mockResolvedValue(null);

    expect(await authenticateApiRequest(request("Bearer t"))).toBeNull();
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });
});
