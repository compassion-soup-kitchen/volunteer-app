import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAFF_ROLES } from "./role-change";

const authMock = vi.fn();
const volunteerProfileCountMock = vi.fn();
const applicationCountMock = vi.fn();
const shiftCountMock = vi.fn();
const shiftSignupFindManyMock = vi.fn();
const shiftSignupCountMock = vi.fn();
const volunteerProfileFindManyMock = vi.fn();
const userFindManyMock = vi.fn();
const userFindUniqueMock = vi.fn();
const hoursForUserMock = vi.fn();
const trainingForUserMock = vi.fn();

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

// The account-liveness re-read that every Server Action now does (see
// `action-auth.ts`). Stubbed active here so these tests keep exercising the
// auth gate itself; `session-account.test.ts` covers the check.
vi.mock("@/lib/data/session-account", () => ({
  isSessionAccountActive: () => Promise.resolve(true),
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
    shiftSignup: {
      findMany: shiftSignupFindManyMock,
      count: shiftSignupCountMock,
    },
    user: { findMany: userFindManyMock, findUnique: userFindUniqueMock },
  }),
}));

// The record page borrows the volunteer-facing hours and training reads. Mocked
// here so a test can assert *whether* they were called - the point of the
// no-profile branch is that they aren't.
vi.mock("@/lib/data/volunteer-dashboard", () => ({
  getVolunteerHoursDataForUser: (...args: unknown[]) => hoursForUserMock(...args),
}));

vi.mock("@/lib/data/volunteer-training", () => ({
  getTrainingHistoryForUser: (...args: unknown[]) =>
    trainingForUserMock(...args),
}));

import {
  getStaffDashboardStats,
  getVolunteerDetail,
  getVolunteersList,
} from "./staff-actions";

const staffSession = { user: { id: "staff-1", role: "COORDINATOR" } };

beforeEach(() => {
  authMock.mockReset();
  volunteerProfileCountMock.mockReset().mockResolvedValue(0);
  applicationCountMock.mockReset().mockResolvedValue(0);
  shiftCountMock.mockReset().mockResolvedValue(0);
  shiftSignupFindManyMock.mockReset().mockResolvedValue([]);
  shiftSignupCountMock.mockReset().mockResolvedValue(0);
  volunteerProfileFindManyMock.mockReset().mockResolvedValue([]);
  userFindManyMock.mockReset().mockResolvedValue([]);
  userFindUniqueMock.mockReset().mockResolvedValue(null);
  hoursForUserMock.mockReset().mockResolvedValue(null);
  trainingForUserMock.mockReset().mockResolvedValue([]);
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

describe("getVolunteerDetail", () => {
  const signedUpAt = new Date("2026-07-01T00:00:00.000Z");

  /** A user row shaped the way the action's `select` asks for it. */
  function userRow(overrides: Record<string, unknown> = {}) {
    return {
      id: "user-1",
      name: "Aroha Williams",
      email: "aroha@example.org.nz",
      image: null,
      role: "VOLUNTEER",
      status: "ACTIVE",
      emailVerified: signedUpAt,
      createdAt: signedUpAt,
      archivedAt: null,
      archivedReason: null,
      archivedBy: null,
      volunteerProfile: null,
      ...overrides,
    };
  }

  function profileRow(overrides: Record<string, unknown> = {}) {
    return {
      id: "profile-1",
      phone: "021 555 1234",
      address: "42 Tory Street",
      dateOfBirth: null,
      emergencyContactName: "Hemi Williams",
      emergencyContactPhone: "021 555 5678",
      emergencyContactRelationship: "Partner",
      bio: null,
      availability: { monday: ["morning"] },
      skills: ["Cooking"],
      status: "ACTIVE",
      mojStatus: "CLEARED",
      createdAt: signedUpAt,
      updatedAt: signedUpAt,
      interests: [{ id: "sa1", name: "Kitchen & Meals" }],
      groups: [{ id: "g1", name: "Team Leaders", tone: "BRAND" }],
      signedAgreements: [],
      documents: [],
      applications: [],
      ...overrides,
    };
  }

  it("returns nothing to a caller who isn't staff", async () => {
    authMock.mockResolvedValue({ user: { id: "vol-1", role: "VOLUNTEER" } });

    expect(await getVolunteerDetail("user-1")).toBeNull();
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns nothing to a signed-out caller", async () => {
    authMock.mockResolvedValue(null);

    expect(await getVolunteerDetail("user-1")).toBeNull();
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns null for a user who doesn't exist", async () => {
    authMock.mockResolvedValue(staffSession);
    userFindUniqueMock.mockResolvedValue(null);

    expect(await getVolunteerDetail("nobody")).toBeNull();
  });

  // Someone who signed in but never applied still has an account worth
  // reading; there is just no profile, and nothing for hours or training to
  // count against.
  it("returns the account with a null profile when there's no application", async () => {
    authMock.mockResolvedValue(staffSession);
    userFindUniqueMock.mockResolvedValue(
      userRow({ name: "Rangi", emailVerified: null, volunteerProfile: null })
    );

    const detail = await getVolunteerDetail("user-1");

    expect(detail?.profile).toBeNull();
    expect(detail?.user).toMatchObject({ name: "Rangi", emailVerified: null });
    expect(detail?.hours).toBeNull();
    expect(detail?.training).toEqual([]);
    expect(hoursForUserMock).not.toHaveBeenCalled();
    expect(trainingForUserMock).not.toHaveBeenCalled();
    // Nothing to read shifts against either - they hang off the profile.
    expect(shiftSignupFindManyMock).not.toHaveBeenCalled();
    expect(shiftSignupCountMock).not.toHaveBeenCalled();
  });

  it("reads hours and training for someone who has a profile", async () => {
    authMock.mockResolvedValue(staffSession);
    userFindUniqueMock.mockResolvedValue(
      userRow({ volunteerProfile: profileRow() })
    );
    hoursForUserMock.mockResolvedValue({ totalHours: 11 });
    trainingForUserMock.mockResolvedValue([{ id: "ta1" }]);

    const detail = await getVolunteerDetail("user-1");

    expect(hoursForUserMock).toHaveBeenCalledWith("user-1");
    expect(trainingForUserMock).toHaveBeenCalledWith("user-1");
    expect(detail?.hours).toEqual({ totalHours: 11 });
    expect(detail?.training).toEqual([{ id: "ta1" }]);
    expect(detail?.profile).toMatchObject({
      emergencyContactName: "Hemi Williams",
      emergencyContactPhone: "021 555 5678",
      groups: [{ id: "g1", name: "Team Leaders", tone: "BRAND" }],
    });
  });

  // The page reads flat names, not nested relations - a shape change here would
  // silently render "by undefined".
  it("flattens the nested relations the page reads by name", async () => {
    authMock.mockResolvedValue(staffSession);
    userFindUniqueMock.mockResolvedValue(
      userRow({
        archivedAt: signedUpAt,
        archivedReason: "Moved away",
        archivedBy: { name: "Admin User" },
        volunteerProfile: profileRow({
          documents: [
            {
              id: "doc1",
              type: "MOJ_FORM",
              fileName: "moj.pdf",
              uploadedAt: signedUpAt,
              uploadedBy: { name: "Admin User" },
            },
          ],
          applications: [
            {
              id: "app1",
              status: "APPROVED",
              submittedAt: signedUpAt,
              reviewedAt: signedUpAt,
              notes: "All good",
              reviewedBy: { name: "Admin User" },
            },
          ],
        }),
      })
    );
    shiftSignupFindManyMock.mockResolvedValue([
      {
        id: "su1",
        status: "ATTENDED",
        shift: {
          date: signedUpAt,
          startTime: "09:00",
          endTime: "12:00",
          serviceArea: { id: "sa1", name: "Kitchen & Meals" },
        },
      },
    ]);
    shiftSignupCountMock.mockResolvedValue(7);

    const detail = await getVolunteerDetail("user-1");

    expect(detail?.user.archivedByName).toBe("Admin User");
    expect(detail?.profile?.documents[0]).toMatchObject({
      fileName: "moj.pdf",
      uploadedByName: "Admin User",
    });
    expect(detail?.profile?.applications[0]).toMatchObject({
      status: "APPROVED",
      reviewedByName: "Admin User",
    });
    expect(detail?.profile?.recentShifts[0]).toMatchObject({
      id: "su1",
      status: "ATTENDED",
      startTime: "09:00",
      serviceArea: { id: "sa1", name: "Kitchen & Meals" },
    });
    // "Showing the N most recent of M" counts past shifts, not every signup.
    expect(detail?.profile?.pastShiftCount).toBe(7);
  });

  /**
   * The whole point of splitting at today: read as one `date desc` run, a
   * fortnight of upcoming bookings pushed the attendance history off the card.
   */
  it("bounds history to the past and the roster to today onwards", async () => {
    authMock.mockResolvedValue(staffSession);
    userFindUniqueMock.mockResolvedValue(
      userRow({ volunteerProfile: profileRow() })
    );

    await getVolunteerDetail("user-1");

    const [history, upcoming] = shiftSignupFindManyMock.mock.calls.map((c) => c[0]);

    expect(history.orderBy).toEqual({ shift: { date: "desc" } });
    expect(history.where.shift.date).toHaveProperty("lt");
    expect(history.take).toBeGreaterThan(0);

    expect(upcoming.orderBy).toEqual({ shift: { date: "asc" } });
    expect(upcoming.where.shift.date).toHaveProperty("gte");
    // A cancelled booking isn't something they're rostered on.
    expect(upcoming.where.status).toEqual({ not: "CANCELLED" });
    expect(upcoming.take).toBeGreaterThan(0);

    // Both halves are cut at the same instant, so no shift can fall through
    // the gap or land in both.
    expect(history.where.shift.date.lt).toEqual(upcoming.where.shift.date.gte);

    // The "of M" count covers history only, matching the card it captions.
    expect(shiftSignupCountMock.mock.calls[0][0].where.shift.date).toHaveProperty(
      "lt"
    );
  });

  it("reads shifts against the profile, not the user", async () => {
    authMock.mockResolvedValue(staffSession);
    userFindUniqueMock.mockResolvedValue(
      userRow({ volunteerProfile: profileRow({ id: "profile-9" }) })
    );

    await getVolunteerDetail("user-1");

    for (const [args] of shiftSignupFindManyMock.mock.calls) {
      expect(args.where.volunteerId).toBe("profile-9");
    }
  });

  it("asks only for groups that are still active", async () => {
    authMock.mockResolvedValue(staffSession);
    userFindUniqueMock.mockResolvedValue(
      userRow({ volunteerProfile: profileRow() })
    );

    await getVolunteerDetail("user-1");

    expect(
      userFindUniqueMock.mock.calls[0][0].select.volunteerProfile.select.groups
    ).toMatchObject({ where: { isArchived: false } });
  });
});
