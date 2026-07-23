import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAFF_ROLES } from "./role-change";

const authMock = vi.fn();
const applicationFindManyMock = vi.fn();
const volunteerGroupByMock = vi.fn();
const volunteerFindManyMock = vi.fn();

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
}));

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    application: { findMany: applicationFindManyMock },
    volunteerProfile: {
      groupBy: volunteerGroupByMock,
      findMany: volunteerFindManyMock,
    },
  }),
}));

import { getOnboardingMetrics, getVolunteerExportData } from "./report-actions";

const staffSession = { user: { id: "staff-1", role: "ADMIN" } };

beforeEach(() => {
  authMock.mockReset().mockResolvedValue(staffSession);
  applicationFindManyMock.mockReset().mockResolvedValue([]);
  volunteerGroupByMock.mockReset().mockResolvedValue([]);
  volunteerFindManyMock.mockReset().mockResolvedValue([]);
});

describe("getOnboardingMetrics", () => {
  it("excludes staff from the volunteer-status funnel (keeping PUBLIC applicants)", async () => {
    await getOnboardingMetrics();

    expect(volunteerGroupByMock).toHaveBeenCalledWith({
      by: ["status"],
      where: { user: { role: { notIn: STAFF_ROLES } } },
      _count: true,
    });
  });
});

describe("getVolunteerExportData", () => {
  it("excludes staff from the volunteer export", async () => {
    await getVolunteerExportData();

    expect(volunteerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["ACTIVE", "APPROVED_FOR_INDUCTION"] },
          user: { role: { notIn: STAFF_ROLES } },
        }),
      })
    );
  });
});
