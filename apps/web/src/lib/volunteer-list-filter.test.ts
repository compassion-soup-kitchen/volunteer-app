import { describe, expect, it } from "vitest";
import {
  NO_APPLICATION_FILTER,
  resolveVolunteerListBuckets,
} from "./volunteer-list-filter";

describe("resolveVolunteerListBuckets", () => {
  it("ALL: queries both groups, no applicant status filter", () => {
    expect(resolveVolunteerListBuckets("ALL")).toEqual({
      includeApplicants: true,
      includeNoApplication: true,
      applicantStatus: null,
    });
  });

  it("NO_APPLICATION: only the never-applied group, no applicants", () => {
    expect(resolveVolunteerListBuckets(NO_APPLICATION_FILTER)).toEqual({
      includeApplicants: false,
      includeNoApplication: true,
      applicantStatus: null,
    });
  });

  it("a specific status: only applicants with that status, no never-applied", () => {
    expect(resolveVolunteerListBuckets("ACTIVE")).toEqual({
      includeApplicants: true,
      includeNoApplication: false,
      applicantStatus: "ACTIVE",
    });
    expect(resolveVolunteerListBuckets("AWAITING_VETTING")).toEqual({
      includeApplicants: true,
      includeNoApplication: false,
      applicantStatus: "AWAITING_VETTING",
    });
  });
});
