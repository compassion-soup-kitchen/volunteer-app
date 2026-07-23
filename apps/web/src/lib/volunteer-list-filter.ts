// Pure helpers for the staff Volunteers directory query (getVolunteersList).
//
// The directory blends two groups: people who have a VolunteerProfile
// (applicants + members) and people who signed in but never applied (no
// profile). Which groups to query, and how to filter applicants, depends on the
// selected status filter. Kept pure so the branching is unit-testable without
// mocking Prisma.

// Pseudo-status used by the directory filter to mean "signed in, never applied".
export const NO_APPLICATION_FILTER = "NO_APPLICATION";

export type VolunteerListBuckets = {
  // Whether to query people who have a VolunteerProfile.
  includeApplicants: boolean;
  // Whether to query people who signed in but never applied (no profile).
  includeNoApplication: boolean;
  // The VolunteerProfile.status to filter applicants by, or null for no filter
  // (i.e. all applicant statuses).
  applicantStatus: string | null;
};

export function resolveVolunteerListBuckets(
  statusFilter: string
): VolunteerListBuckets {
  const isNoApplication = statusFilter === NO_APPLICATION_FILTER;
  const isAll = statusFilter === "ALL";
  return {
    includeApplicants: !isNoApplication,
    includeNoApplication: isAll || isNoApplication,
    applicantStatus: isAll || isNoApplication ? null : statusFilter,
  };
}
