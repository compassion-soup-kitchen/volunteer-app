import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({ volunteerProfile: { findUnique } }),
}));

import {
  getApplicationStatusForUser,
  getProfileForUser,
} from "./volunteer-profile";

/**
 * Reviewers write `Application.notes` under a label promising the applicant
 * can't see it, so these reads must not load that column at all. Filtering it
 * out later is how it leaked in the first place.
 */
describe("what applicants can read about their application", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("never selects the reviewer's private notes for the status read", async () => {
    findUnique.mockResolvedValue({ status: "APPLICATION_SUBMITTED", applications: [] });

    await getApplicationStatusForUser("user-1");

    const { select } = findUnique.mock.calls[0][0];
    expect(select.applications.select).toEqual({
      status: true,
      submittedAt: true,
      applicantMessage: true,
    });
  });

  it("returns the message written for the applicant", async () => {
    const submittedAt = new Date("2026-11-01T00:00:00Z");
    findUnique.mockResolvedValue({
      status: "APPLICATION_SUBMITTED",
      applications: [
        { status: "INFO_REQUESTED", submittedAt, applicantMessage: "Please send a referee." },
      ],
    });

    await expect(getApplicationStatusForUser("user-1")).resolves.toEqual({
      profileStatus: "APPLICATION_SUBMITTED",
      applicationStatus: "INFO_REQUESTED",
      applicantMessage: "Please send a referee.",
      submittedAt,
    });
  });

  it("doesn't load application rows with the volunteer's own profile", async () => {
    findUnique.mockResolvedValue(null);

    await getProfileForUser("user-1");

    expect(findUnique.mock.calls[0][0].include).not.toHaveProperty("applications");
  });
});
