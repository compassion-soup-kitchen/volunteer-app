import { describe, expect, it } from "vitest";

import type { ApplicationListItem, VolunteerListItem } from "@/lib/staff-actions";

import {
  APPLICATION_SORT_KEYS,
  APPLICATION_SORT_OPTIONS,
  DEFAULT_APPLICATION_SORT,
  VOLUNTEER_SORT_KEYS,
  VOLUNTEER_SORT_OPTIONS,
  ariaSort,
  formatSort,
  nextSort,
  parseSort,
  sortApplications,
  sortVolunteers,
} from "./table-sort";

function volunteer(
  name: string | null,
  {
    status = "ACTIVE",
    hasProfile = true,
    shifts = 0,
    joined = "2026-01-01",
  }: { status?: string | null; hasProfile?: boolean; shifts?: number; joined?: string } = {}
): VolunteerListItem {
  return {
    id: name ?? "nameless",
    hasProfile,
    phone: null,
    status: hasProfile ? status : null,
    mojStatus: null,
    createdAt: new Date(`${joined}T00:00:00Z`),
    user: {
      id: name ?? "nameless",
      name,
      email: null,
      role: "VOLUNTEER",
      status: "ACTIVE",
      archivedAt: null,
      archivedReason: null,
      isOffline: false,
    },
    interests: [],
    groups: [],
    _count: { shiftSignups: shifts },
  };
}

function application(
  name: string,
  status: string,
  submitted: string
): ApplicationListItem {
  return {
    id: `${name}-${submitted}`,
    status,
    submittedAt: new Date(`${submitted}T00:00:00Z`),
    reviewedAt: null,
    notes: null,
    volunteer: {
      id: name,
      phone: null,
      status: "APPLICATION_SUBMITTED",
      mojStatus: "NOT_STARTED",
      user: { name, email: null },
      interests: [],
    },
    reviewedBy: null,
  };
}

const names = (rows: VolunteerListItem[]) => rows.map((row) => row.user.name);
const applicants = (rows: ApplicationListItem[]) => rows.map((row) => row.volunteer.user.name);

describe("parseSort / formatSort", () => {
  it("reads a key, with a leading minus for descending", () => {
    expect(parseSort("name", VOLUNTEER_SORT_KEYS)).toEqual({ key: "name", direction: "asc" });
    expect(parseSort("-joined", VOLUNTEER_SORT_KEYS)).toEqual({
      key: "joined",
      direction: "desc",
    });
  });

  it("ignores anything that isn't one of the table's columns", () => {
    expect(parseSort(undefined, VOLUNTEER_SORT_KEYS)).toBeNull();
    expect(parseSort("", VOLUNTEER_SORT_KEYS)).toBeNull();
    expect(parseSort("submitted", VOLUNTEER_SORT_KEYS)).toBeNull();
    expect(parseSort("-email", APPLICATION_SORT_KEYS)).toBeNull();
  });

  it("round-trips", () => {
    for (const value of ["status", "-status", "shifts", "-name"]) {
      expect(formatSort(parseSort(value, VOLUNTEER_SORT_KEYS)!)).toBe(value);
    }
  });
});

describe("nextSort", () => {
  it("starts a new column its natural way round", () => {
    expect(nextSort(null, "name", "asc")).toEqual({ key: "name", direction: "asc" });
    expect(nextSort({ key: "name", direction: "asc" }, "joined", "desc")).toEqual({
      key: "joined",
      direction: "desc",
    });
  });

  it("flips the column already sorting", () => {
    expect(nextSort({ key: "joined", direction: "desc" }, "joined", "desc")).toEqual({
      key: "joined",
      direction: "asc",
    });
  });
});

describe("ariaSort", () => {
  it("is set on the sorting column only", () => {
    const sort = { key: "name", direction: "desc" } as const;
    expect(ariaSort(sort, "name")).toBe("descending");
    expect(ariaSort({ ...sort, direction: "asc" }, "name")).toBe("ascending");
    expect(ariaSort(sort, "status")).toBeUndefined();
    expect(ariaSort(null, "name")).toBeUndefined();
  });
});

describe("sort menu options", () => {
  it.each([
    ["volunteers", VOLUNTEER_SORT_OPTIONS, VOLUNTEER_SORT_KEYS],
    ["applications", APPLICATION_SORT_OPTIONS, APPLICATION_SORT_KEYS],
  ] as const)("offer every %s column both ways round, once each", (_, options, keys) => {
    const values = options.map((option) => formatSort(option.sort));
    expect(new Set(values).size).toBe(values.length);
    expect([...values].sort()).toEqual(keys.flatMap((key) => [key, `-${key}`]).sort());
  });

  it("starts the applications menu on the list's default order", () => {
    expect(APPLICATION_SORT_OPTIONS[0].sort).toEqual(DEFAULT_APPLICATION_SORT);
  });
});

describe("sortVolunteers", () => {
  const rows = [
    volunteer("Tāne Raukawa", { status: "ACTIVE", shifts: 4, joined: "2026-03-01" }),
    volunteer("aroha Williams", { status: "AWAITING_VETTING", shifts: 0, joined: "2026-05-01" }),
    volunteer("Hemi Tūhoe", { hasProfile: false, joined: "2026-02-01" }),
    volunteer(null, { status: "APPLICATION_SUBMITTED", shifts: 1, joined: "2026-04-01" }),
    volunteer("Mere Ngata", { status: "ACTIVE", shifts: 4, joined: "2026-01-01" }),
  ];

  it("keeps the server's order with no sort, without touching the input", () => {
    const sorted = sortVolunteers(rows, null);
    expect(sorted).toEqual(rows);
    expect(sorted).not.toBe(rows);
  });

  it("sorts names alphabetically, ignoring case and macrons, with nameless under Unnamed", () => {
    expect(names(sortVolunteers(rows, { key: "name", direction: "asc" }))).toEqual([
      "aroha Williams",
      "Hemi Tūhoe",
      "Mere Ngata",
      "Tāne Raukawa",
      null,
    ]);
    expect(names(sortVolunteers(rows, { key: "name", direction: "desc" }))).toEqual([
      null,
      "Tāne Raukawa",
      "Mere Ngata",
      "Hemi Tūhoe",
      "aroha Williams",
    ]);
  });

  it("sorts status in the order people move through it, no application last", () => {
    expect(names(sortVolunteers(rows, { key: "status", direction: "asc" }))).toEqual([
      null,
      "aroha Williams",
      "Mere Ngata",
      "Tāne Raukawa",
      "Hemi Tūhoe",
    ]);
  });

  it("breaks ties by name whichever way the column runs", () => {
    expect(names(sortVolunteers(rows, { key: "shifts", direction: "desc" }))).toEqual([
      "Mere Ngata",
      "Tāne Raukawa",
      null,
      "aroha Williams",
      "Hemi Tūhoe",
    ]);
    expect(names(sortVolunteers(rows, { key: "shifts", direction: "asc" })).slice(0, 2)).toEqual([
      "aroha Williams",
      "Hemi Tūhoe",
    ]);
  });

  it("sorts by when people joined", () => {
    expect(names(sortVolunteers(rows, { key: "joined", direction: "desc" }))).toEqual([
      "aroha Williams",
      null,
      "Tāne Raukawa",
      "Hemi Tūhoe",
      "Mere Ngata",
    ]);
  });
});

describe("sortApplications", () => {
  const rows = [
    application("Mere Ngata", "APPROVED", "2026-09-01"),
    application("Hemi Tūhoe", "PENDING", "2026-08-01"),
    application("Aroha Williams", "DECLINED", "2026-10-01"),
    application("Tāne Raukawa", "PENDING", "2026-10-10"),
    application("Kiri Parata", "INFO_REQUESTED", "2026-07-01"),
  ];

  it("opens with what needs reviewing on top, newest first within a status", () => {
    expect(applicants(sortApplications(rows, DEFAULT_APPLICATION_SORT))).toEqual([
      "Tāne Raukawa",
      "Hemi Tūhoe",
      "Kiri Parata",
      "Mere Ngata",
      "Aroha Williams",
    ]);
  });

  it("sorts by applicant name", () => {
    expect(applicants(sortApplications(rows, { key: "name", direction: "asc" }))).toEqual([
      "Aroha Williams",
      "Hemi Tūhoe",
      "Kiri Parata",
      "Mere Ngata",
      "Tāne Raukawa",
    ]);
  });

  it("sorts by when the application came in", () => {
    expect(applicants(sortApplications(rows, { key: "submitted", direction: "asc" }))).toEqual([
      "Kiri Parata",
      "Hemi Tūhoe",
      "Mere Ngata",
      "Aroha Williams",
      "Tāne Raukawa",
    ]);
  });
});
