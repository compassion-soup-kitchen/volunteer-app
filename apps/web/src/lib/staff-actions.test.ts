import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAFF_ROLES } from "./role-change";

const authMock = vi.fn();
const volunteerProfileCountMock = vi.fn();
const applicationCountMock = vi.fn();
const shiftCountMock = vi.fn();
const shiftSignupFindManyMock = vi.fn();

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
    volunteerProfile: { count: volunteerProfileCountMock },
    application: { count: applicationCountMock },
    shift: { count: shiftCountMock },
    shiftSignup: { findMany: shiftSignupFindManyMock },
  }),
}));

import { getStaffDashboardStats } from "./staff-actions";

const staffSession = { user: { id: "staff-1", role: "COORDINATOR" } };

beforeEach(() => {
  authMock.mockReset();
  volunteerProfileCountMock.mockReset().mockResolvedValue(0);
  applicationCountMock.mockReset().mockResolvedValue(0);
  shiftCountMock.mockReset().mockResolvedValue(0);
  shiftSignupFindManyMock.mockReset().mockResolvedValue([]);
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
