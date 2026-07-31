import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const loadAccountErasureFactsMock = vi.fn();
const eraseUserAccountMock = vi.fn();
const authenticateApiRequestMock = vi.fn();

vi.mock("@/lib/data/account-erasure", () => ({
  loadAccountErasureFacts: (...args: unknown[]) =>
    loadAccountErasureFactsMock(...args),
  eraseUserAccount: (...args: unknown[]) => eraseUserAccountMock(...args),
}));

// The real wrapper, but with its authentication stubbed - the point here is
// the delete flow, and `api/auth` is covered by its own tests.
vi.mock("@/lib/api/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    withApiAuth:
      (handler: (req: unknown, user: unknown, ctx: unknown) => Promise<Response>) =>
      async (req: unknown, ctx: unknown) => {
        const user = authenticateApiRequestMock();
        if (!user) {
          return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
        }
        return handler(req, user, ctx);
      },
  };
});

import { DELETE, GET } from "./route";

function request(body?: unknown): NextRequest {
  return new Request("http://test.local/api/v1/me/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as NextRequest;
}

const facts = {
  userId: "u1",
  name: "Aroha",
  email: "aroha@example.org.nz",
  role: "VOLUNTEER" as const,
  isArchived: false,
  erases: {
    shiftSignups: 6,
    attendedShifts: 3,
    trainingAttendances: 2,
    documents: 0,
    signedAgreements: 2,
  },
  authored: { shifts: 0, trainingSessions: 0, announcements: 0 },
  isLastAdmin: false,
  profileId: "p1",
};

beforeEach(() => {
  vi.clearAllMocks();
  authenticateApiRequestMock.mockReturnValue({ id: "u1", role: "VOLUNTEER" });
  loadAccountErasureFactsMock.mockResolvedValue(facts);
  eraseUserAccountMock.mockResolvedValue({ success: true });
});

describe("GET /api/v1/me/account", () => {
  it("requires authentication", async () => {
    authenticateApiRequestMock.mockReturnValue(null);
    expect((await GET(request(), undefined)).status).toBe(401);
  });

  it("summarises what deletion would erase, without erasing anything", async () => {
    const res = await GET(request(), undefined);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      email: "aroha@example.org.nz",
      erases: { attendedShifts: 3 },
      blocker: null,
    });
    expect(eraseUserAccountMock).not.toHaveBeenCalled();
  });

  it("reports the blocker so the app can explain it up front", async () => {
    loadAccountErasureFactsMock.mockResolvedValue({ ...facts, isLastAdmin: true });

    const body = await (await GET(request(), undefined)).json();

    expect(body.blocker).toContain("only admin left");
  });

  it("404s for an account that has already gone", async () => {
    loadAccountErasureFactsMock.mockResolvedValue(null);
    expect((await GET(request(), undefined)).status).toBe(404);
  });
});

describe("DELETE /api/v1/me/account", () => {
  it("requires authentication", async () => {
    authenticateApiRequestMock.mockReturnValue(null);
    expect((await DELETE(request({ confirmation: "x" }), undefined)).status).toBe(401);
  });

  it("erases the account when the email is typed back", async () => {
    const res = await DELETE(
      request({ confirmation: "aroha@example.org.nz" }),
      undefined
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    // Actor and target are the same person - that is the whole point.
    expect(eraseUserAccountMock).toHaveBeenCalledWith(facts, "u1");
  });

  it("rejects a body with no confirmation before reading anything", async () => {
    const res = await DELETE(request({}), undefined);

    expect(res.status).toBe(400);
    expect(loadAccountErasureFactsMock).not.toHaveBeenCalled();
  });

  it("rejects a mistyped confirmation without erasing", async () => {
    const res = await DELETE(request({ confirmation: "wrong@example.org" }), undefined);

    expect(res.status).toBe(400);
    expect(eraseUserAccountMock).not.toHaveBeenCalled();
  });

  // 409 rather than 400: nothing about the request is malformed, the account
  // is simply in a state that has to change first.
  it("409s the last admin, with something they can act on", async () => {
    loadAccountErasureFactsMock.mockResolvedValue({ ...facts, isLastAdmin: true });

    const res = await DELETE(
      request({ confirmation: "aroha@example.org.nz" }),
      undefined
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("only admin left"),
    });
    expect(eraseUserAccountMock).not.toHaveBeenCalled();
  });

  it("surfaces an erasure failure rather than reporting success", async () => {
    eraseUserAccountMock.mockResolvedValue({ error: "Something went wrong." });

    const res = await DELETE(
      request({ confirmation: "aroha@example.org.nz" }),
      undefined
    );

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Something went wrong." });
  });

  it("404s for an account that has already gone", async () => {
    loadAccountErasureFactsMock.mockResolvedValue(null);

    const res = await DELETE(
      request({ confirmation: "aroha@example.org.nz" }),
      undefined
    );

    expect(res.status).toBe(404);
  });
});
