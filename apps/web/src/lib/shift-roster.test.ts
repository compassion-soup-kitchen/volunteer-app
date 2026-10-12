import { describe, expect, it } from "vitest";

import { decideStaffRoster, staffRemovalError } from "./shift-roster";

const base = {
  shiftDate: "2026-10-19",
  today: "2026-10-13",
  capacity: 4,
  seatedCount: 1,
  existingStatus: null,
  volunteerIsActive: true,
} as const;

describe("decideStaffRoster", () => {
  it("signs someone up for a future shift", () => {
    expect(decideStaffRoster(base)).toEqual({ action: "create", status: "SIGNED_UP" });
  });

  it("signs someone up for today, whose attendance is marked later", () => {
    expect(decideStaffRoster({ ...base, shiftDate: "2026-10-13" })).toEqual({
      action: "create",
      status: "SIGNED_UP",
    });
  });

  it("records attendance when adding someone to a past shift", () => {
    expect(decideStaffRoster({ ...base, shiftDate: "2026-10-12" })).toEqual({
      action: "create",
      status: "ATTENDED",
    });
  });

  it("reactivates a cancelled or no-show row rather than duplicating it", () => {
    expect(decideStaffRoster({ ...base, existingStatus: "CANCELLED" })).toEqual({
      action: "reactivate",
      status: "SIGNED_UP",
    });
    expect(
      decideStaffRoster({ ...base, shiftDate: "2026-10-12", existingStatus: "NO_SHOW" })
    ).toEqual({ action: "reactivate", status: "ATTENDED" });
  });

  it.each(["SIGNED_UP", "ATTENDED"] as const)(
    "refuses someone already %s",
    (existingStatus) => {
      expect(decideStaffRoster({ ...base, existingStatus })).toEqual({
        action: "reject",
        error: "They're already on this shift.",
      });
    }
  );

  it("refuses a full shift", () => {
    expect(decideStaffRoster({ ...base, seatedCount: 4 })).toMatchObject({
      action: "reject",
      error: expect.stringMatching(/full/),
    });
  });

  it("refuses someone who isn't active", () => {
    expect(decideStaffRoster({ ...base, volunteerIsActive: false })).toMatchObject({
      action: "reject",
      error: expect.stringMatching(/Only active volunteers/),
    });
  });
});

describe("staffRemovalError", () => {
  it("allows taking off someone still expected", () => {
    expect(staffRemovalError("SIGNED_UP")).toBeNull();
  });

  it("refuses once attendance is marked", () => {
    expect(staffRemovalError("ATTENDED")).toMatch(/already marked/);
    expect(staffRemovalError("NO_SHOW")).toMatch(/already marked/);
  });

  it("refuses a cancelled row", () => {
    expect(staffRemovalError("CANCELLED")).toMatch(/not on this shift/);
  });
});
