import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getShiftWeekForUserMock = vi.fn();

vi.mock("@/lib/data/volunteer-shifts", () => ({
  getShiftWeekForUser: (...args: unknown[]) => getShiftWeekForUserMock(...args),
}));

// Authentication has its own tests; here every request is a signed-in volunteer.
vi.mock("@/lib/api/auth", () => ({
  withApiAuth:
    (handler: (req: unknown, user: unknown, ctx: unknown) => Promise<Response>) =>
    (req: unknown, ctx: unknown) =>
      handler(req, { id: "u1" }, ctx),
}));

import { GET } from "./route";

const get = (query = "") =>
  GET(new NextRequest(`http://test.local/api/v1/shifts/week${query}`), {} as never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/shifts/week", () => {
  it("returns the week with calendar days on the wire", async () => {
    getShiftWeekForUserMock.mockResolvedValue({
      weekStart: "2026-11-09",
      nextWeek: "2026-11-16",
      shifts: [
        {
          id: "s1",
          date: new Date("2026-11-11T00:00:00.000Z"),
          startTime: "09:00",
          endTime: "13:00",
          capacity: 4,
          notes: null,
          serviceArea: { id: "kitchen", name: "Kitchen", description: null },
          signupCount: 1,
          userSignupId: null,
          userSignupStatus: null,
          offersCloseOn: null,
          heldForOffers: false,
          userOfferStatus: null,
          userOnLeave: false,
        },
      ],
    });

    const res = await get("?from=2026-11-09&serviceAreaId=kitchen");

    expect(res.status).toBe(200);
    expect(getShiftWeekForUserMock).toHaveBeenCalledWith("u1", {
      from: "2026-11-09",
      serviceAreaId: "kitchen",
    });
    const body = await res.json();
    expect(body).toMatchObject({ weekStart: "2026-11-09", nextWeek: "2026-11-16" });
    expect(body.shifts[0]).toMatchObject({ id: "s1", date: "2026-11-11", onLeave: false });
  });

  it("asks for the first page when there's no `from`", async () => {
    getShiftWeekForUserMock.mockResolvedValue({ weekStart: null, shifts: [], nextWeek: null });

    const res = await get();

    expect(res.status).toBe(200);
    expect(getShiftWeekForUserMock).toHaveBeenCalledWith("u1", {
      from: undefined,
      serviceAreaId: undefined,
    });
  });

  it("refuses a `from` that isn't a calendar day", async () => {
    const res = await get("?from=2026-02-30");

    expect(res.status).toBe(400);
    expect(getShiftWeekForUserMock).not.toHaveBeenCalled();
  });
});
