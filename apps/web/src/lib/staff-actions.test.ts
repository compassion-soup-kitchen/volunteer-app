import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAFF_ROLES } from "./role-change";

const authMock = vi.fn();
const volunteerProfileCountMock = vi.fn();
const applicationCountMock = vi.fn();
const shiftCountMock = vi.fn();
const shiftSignupFindManyMock = vi.fn();
const volunteerProfileFindManyMock = vi.fn();
const userFindManyMock = vi.fn();

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
  after: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

vi.mock("@/lib/push", () => ({
  sendPushToUsers: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    volunteerProfile: {
      count: volunteerProfileCountMock,
      findMany: volunteerProfileFindManyMock,
    },
    application: { count: applicationCountMock },
    shift: { count: shiftCountMock },
    shiftSignup: { findMany: shiftSignupFindManyMock },
    user: { findMany: userFindManyMock },
  }),
}));

import { getStaffDashboardStats, getVolunteersList } from "./staff-actions";

const staffSession = { user: { id: "staff-1", role: "COORDINATOR" } };

beforeEach(() => {
  authMock.mockReset();
  volunteerProfileCountMock.mockReset().mockResolvedValue(0);
  applicationCountMock.mockReset().mockResolvedValue(0);
  shiftCountMock.mockReset().mockResolvedValue(0);
  shiftSignupFindManyMock.mockReset().mockResolvedValue([]);
  volunteerProfileFindManyMock.mockReset().mockResolvedValue([]);
  userFindManyMock.mockReset().mockResolvedValue([]);
});

describe("getStaffDashboardStats", () => {
  it("returns null when the caller isn't staff", async () => {
    authMock.mockResolvedValue(null);
    expect(await getStaffDashboardStats()).toBeNull();
    expect(volunteerProfileCountMock).not.toHaveBeenCalled();
  });

  it("excludes staff (COORDINATOR/ADMIN) from the active-volunteer count", async () => {
    authMock.mockResolvedValue(staffSession);

    await getStaffDashboardStats();

    expect(volunteerProfileCountMock).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        user: { status: "ACTIVE", role: { notIn: STAFF_ROLES } },
      },
    });
  });
});

describe("getVolunteersList group filtering", () => {
  beforeEach(() => authMock.mockResolvedValue(staffSession));

  it("returns nothing to a caller who isn't staff", async () => {
    authMock.mockResolvedValue({ user: { id: "vol-1", role: "VOLUNTEER" } });

    expect(await getVolunteersList()).toEqual([]);
    expect(volunteerProfileFindManyMock).not.toHaveBeenCalled();
  });

  it("leaves the query alone when no group is chosen", async () => {
    await getVolunteersList({ status: "ALL" });

    const where = volunteerProfileFindManyMock.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("groups");
    // "ALL" still asks for the people who signed in but never applied.
    expect(userFindManyMock).toHaveBeenCalled();
  });

  it('treats the "ALL" group option as no filter', async () => {
    await getVolunteersList({ status: "ALL", groupId: "ALL" });

    expect(volunteerProfileFindManyMock.mock.calls[0][0].where).not.toHaveProperty(
      "groups"
    );
    expect(userFindManyMock).toHaveBeenCalled();
  });

  it("filters applicants by membership when a group is chosen", async () => {
    await getVolunteersList({ status: "ALL", groupId: "g1" });

    expect(volunteerProfileFindManyMock.mock.calls[0][0].where).toMatchObject({
      groups: { some: { id: "g1" } },
    });
  });

  it("drops the no-application bucket when a group is chosen", async () => {
    // Membership hangs off the profile, so people without one can never match.
    await getVolunteersList({ status: "ALL", groupId: "g1" });

    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("carries each person's active groups onto the list item", async () => {
    const groups = [{ id: "g1", name: "Team Leaders", tone: "BRAND" }];
    volunteerProfileFindManyMock.mockResolvedValue([
      {
        id: "p1",
        phone: null,
        status: "ACTIVE",
        mojStatus: "CLEARED",
        createdAt: new Date("2026-01-01"),
        user: {
          id: "u1",
          name: "Aroha Williams",
          email: "aroha@example.nz",
          role: "VOLUNTEER",
          status: "ACTIVE",
          archivedAt: null,
          archivedReason: null,
        },
        interests: [],
        groups,
        _count: { shiftSignups: 3 },
      },
    ]);
    userFindManyMock.mockResolvedValue([
      {
        id: "u2",
        name: "Never Applied",
        email: "new@example.nz",
        role: "PUBLIC",
        status: "ACTIVE",
        archivedAt: null,
        archivedReason: null,
        createdAt: new Date("2026-02-01"),
      },
    ]);

    const [applicant, noApplication] = await getVolunteersList({ status: "ALL" });

    expect(applicant.groups).toEqual(groups);
    // Someone with no profile has nowhere to hold membership.
    expect(noApplication.groups).toEqual([]);
  });

  it("asks only for groups that are still active", async () => {
    await getVolunteersList({ status: "ALL" });

    expect(volunteerProfileFindManyMock.mock.calls[0][0].include.groups).toEqual({
      where: { isArchived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, tone: true },
    });
  });
});
