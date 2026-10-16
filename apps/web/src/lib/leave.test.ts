import { describe, expect, it } from "vitest";

import {
  deleteLeaveBlocker,
  describeLeaveStatus,
  endLeaveDecision,
  formatLeaveLength,
  formatLeaveRange,
  keepsLeave,
  leaveInput,
  leaveLength,
  leaveLoggedNotice,
  leaveOn,
  leaveSaveBlocker,
  leaveStage,
  rosterChanges,
  subtractRange,
} from "./leave";

const TODAY = "2026-10-16";
const range = (startsOn: string, endsOn: string) => ({ startsOn, endsOn });

describe("keepsLeave", () => {
  it("lets anyone with a volunteer record keep leave, whatever their role", () => {
    expect(keepsLeave({ role: "VOLUNTEER", hasVolunteerProfile: true })).toBe(true);
    expect(keepsLeave({ role: "COORDINATOR", hasVolunteerProfile: true })).toBe(true);
  });

  it("lets the kitchen team keep leave without one", () => {
    expect(keepsLeave({ role: "COORDINATOR", hasVolunteerProfile: false })).toBe(true);
    expect(keepsLeave({ role: "ADMIN", hasVolunteerProfile: false })).toBe(true);
  });

  it("waits for the application from everyone else", () => {
    expect(keepsLeave({ role: "PUBLIC", hasVolunteerProfile: false })).toBe(false);
    expect(keepsLeave({ role: "VOLUNTEER", hasVolunteerProfile: false })).toBe(false);
  });
});

describe("leaveInput", () => {
  it("accepts a stretch of days with an optional reason", () => {
    const parsed = leaveInput.parse({ startsOn: "2026-11-03", endsOn: "2026-11-14", reason: "  Overseas " });
    expect(parsed).toEqual({ startsOn: "2026-11-03", endsOn: "2026-11-14", reason: "Overseas" });
  });

  it("turns a blank reason into null", () => {
    expect(leaveInput.parse({ startsOn: "2026-11-03", endsOn: "2026-11-03", reason: "  " }).reason).toBeNull();
    expect(leaveInput.parse({ startsOn: "2026-11-03", endsOn: "2026-11-03" }).reason).toBeNull();
  });

  it("refuses an end before the start", () => {
    const result = leaveInput.safeParse({ startsOn: "2026-11-14", endsOn: "2026-11-03" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/can't be before/);
  });

  it("refuses something that isn't a calendar day", () => {
    expect(leaveInput.safeParse({ startsOn: "2026-02-30", endsOn: "2026-03-01" }).success).toBe(false);
  });

  it("caps leave at a year", () => {
    expect(leaveInput.safeParse({ startsOn: "2027-01-01", endsOn: "2028-01-01" }).success).toBe(true);
    expect(leaveInput.safeParse({ startsOn: "2027-01-01", endsOn: "2028-01-02" }).success).toBe(false);
  });
});

describe("leaveLength and leaveStage", () => {
  it("counts both ends", () => {
    expect(leaveLength(range("2026-11-03", "2026-11-03"))).toBe(1);
    expect(leaveLength(range("2026-11-03", "2026-11-14"))).toBe(12);
    // Across the April daylight-saving change, which Date maths can trip on.
    expect(leaveLength(range("2027-04-01", "2027-04-10"))).toBe(10);
  });

  it("places leave against today", () => {
    expect(leaveStage(range("2026-10-17", "2026-10-20"), TODAY)).toBe("upcoming");
    expect(leaveStage(range("2026-10-16", "2026-10-16"), TODAY)).toBe("current");
    expect(leaveStage(range("2026-10-01", "2026-10-31"), TODAY)).toBe("current");
    expect(leaveStage(range("2026-10-01", "2026-10-15"), TODAY)).toBe("past");
  });

  it("finds the leave covering a day", () => {
    const ranges = [range("2026-11-01", "2026-11-05"), range("2026-12-20", "2027-01-05")];
    expect(leaveOn(ranges, "2026-11-05")).toBe(ranges[0]);
    expect(leaveOn(ranges, "2027-01-01")).toBe(ranges[1]);
    expect(leaveOn(ranges, "2026-11-06")).toBeNull();
  });
});

describe("subtractRange", () => {
  const a = range("2026-11-01", "2026-11-30");

  it("leaves a range alone when nothing overlaps", () => {
    expect(subtractRange(a, null)).toEqual([a]);
    expect(subtractRange(a, range("2026-12-01", "2026-12-05"))).toEqual([a]);
  });

  it("splits around a stretch in the middle", () => {
    expect(subtractRange(a, range("2026-11-10", "2026-11-12"))).toEqual([
      range("2026-11-01", "2026-11-09"),
      range("2026-11-13", "2026-11-30"),
    ]);
  });

  it("trims either end", () => {
    expect(subtractRange(a, range("2026-10-20", "2026-11-10"))).toEqual([range("2026-11-11", "2026-11-30")]);
    expect(subtractRange(a, range("2026-11-25", "2026-12-10"))).toEqual([range("2026-11-01", "2026-11-24")]);
  });

  it("leaves nothing when fully covered", () => {
    expect(subtractRange(a, range("2026-10-01", "2026-12-31"))).toEqual([]);
  });
});

describe("rosterChanges", () => {
  it("takes the whole of new leave off the roster", () => {
    expect(rosterChanges({ before: null, after: range("2026-11-03", "2026-11-14"), today: TODAY })).toEqual({
      takeOff: [range("2026-11-03", "2026-11-14")],
      putBack: [],
    });
  });

  it("never reaches back before today", () => {
    expect(rosterChanges({ before: null, after: range("2026-10-10", "2026-10-20"), today: TODAY })).toEqual({
      takeOff: [range("2026-10-16", "2026-10-20")],
      putBack: [],
    });
  });

  it("puts cancelled leave back from today on", () => {
    expect(rosterChanges({ before: range("2026-10-10", "2026-10-20"), after: null, today: TODAY })).toEqual({
      takeOff: [],
      putBack: [range("2026-10-16", "2026-10-20")],
    });
  });

  it("extending only takes off the new days", () => {
    expect(
      rosterChanges({
        before: range("2026-11-03", "2026-11-14"),
        after: range("2026-11-03", "2026-11-21"),
        today: TODAY,
      })
    ).toEqual({ takeOff: [range("2026-11-15", "2026-11-21")], putBack: [] });
  });

  it("moving leave does both", () => {
    expect(
      rosterChanges({
        before: range("2026-11-03", "2026-11-14"),
        after: range("2026-11-10", "2026-11-20"),
        today: TODAY,
      })
    ).toEqual({
      takeOff: [range("2026-11-15", "2026-11-20")],
      putBack: [range("2026-11-03", "2026-11-09")],
    });
  });

  it("changes to days already gone change nothing", () => {
    expect(
      rosterChanges({
        before: range("2026-10-01", "2026-10-10"),
        after: range("2026-10-01", "2026-10-05"),
        today: TODAY,
      })
    ).toEqual({ takeOff: [], putBack: [] });
  });
});

describe("leaveSaveBlocker", () => {
  const save = (overrides: Partial<Parameters<typeof leaveSaveBlocker>[0]>) =>
    leaveSaveBlocker({
      range: range("2026-11-03", "2026-11-14"),
      today: TODAY,
      existing: null,
      others: [],
      ...overrides,
    });

  it("lets new leave through", () => {
    expect(save({})).toBeNull();
  });

  it("lets new leave start in the past - logging it late", () => {
    expect(save({ range: range("2026-10-12", "2026-10-20") })).toBeNull();
  });

  it("refuses leave that has already finished", () => {
    expect(save({ range: range("2026-10-01", "2026-10-15") })).toMatch(/already finished/);
  });

  it("refuses leave starting years away", () => {
    expect(save({ range: range("2029-01-01", "2029-01-02") })).toMatch(/two years/);
  });

  it("refuses overlapping leave and names it", () => {
    expect(save({ others: [range("2026-11-10", "2026-11-20")] })).toBe(
      "That overlaps leave already logged for 10 – 20 Nov."
    );
  });

  it("keeps past leave as it was", () => {
    expect(save({ existing: range("2026-10-01", "2026-10-10"), range: range("2026-10-01", "2026-10-20") })).toMatch(
      /over/
    );
  });

  it("keeps the first day of leave under way", () => {
    const existing = range("2026-10-10", "2026-10-20");
    expect(save({ existing, range: range("2026-10-11", "2026-10-20") })).toMatch(/first day can't move/);
    expect(save({ existing, range: range("2026-10-10", "2026-10-27") })).toBeNull();
    expect(save({ existing, range: range("2026-10-10", "2026-10-16") })).toBeNull();
    expect(save({ existing, range: range("2026-10-10", "2026-10-15") })).toMatch(/already finished/);
  });

  it("moves upcoming leave freely", () => {
    expect(save({ existing: range("2026-11-03", "2026-11-14"), range: range("2026-12-01", "2026-12-05") })).toBeNull();
  });
});

describe("endLeaveDecision", () => {
  it("keeps the days already away", () => {
    expect(endLeaveDecision(range("2026-10-10", "2026-10-20"), TODAY)).toEqual({
      action: "shorten",
      endsOn: "2026-10-15",
    });
  });

  it("drops leave that only started today", () => {
    expect(endLeaveDecision(range("2026-10-16", "2026-10-20"), TODAY)).toEqual({ action: "delete" });
  });

  it("refuses leave that isn't under way", () => {
    expect(endLeaveDecision(range("2026-10-20", "2026-10-25"), TODAY)).toMatchObject({ action: "reject" });
    expect(endLeaveDecision(range("2026-10-01", "2026-10-05"), TODAY)).toMatchObject({ action: "reject" });
  });
});

describe("deleteLeaveBlocker", () => {
  it("lets a volunteer cancel leave that hasn't started", () => {
    expect(deleteLeaveBlocker({ range: range("2026-11-03", "2026-11-14"), today: TODAY, isStaff: false })).toBeNull();
  });

  it("points a volunteer on leave at coming back instead", () => {
    expect(deleteLeaveBlocker({ range: range("2026-10-10", "2026-10-20"), today: TODAY, isStaff: false })).toMatch(
      /I'm back/
    );
    expect(deleteLeaveBlocker({ range: range("2026-10-01", "2026-10-05"), today: TODAY, isStaff: false })).toMatch(
      /record/
    );
  });

  it("lets staff remove any of it", () => {
    expect(deleteLeaveBlocker({ range: range("2026-10-01", "2026-10-05"), today: TODAY, isStaff: true })).toBeNull();
  });
});

describe("words", () => {
  it("formats ranges compactly", () => {
    expect(formatLeaveRange(range("2026-11-03", "2026-11-03"))).toBe("Tue, 3 Nov");
    expect(formatLeaveRange(range("2026-11-03", "2026-11-14"))).toBe("3 – 14 Nov");
    expect(formatLeaveRange(range("2026-11-28", "2026-12-04"))).toBe("28 Nov – 4 Dec");
    expect(formatLeaveRange(range("2026-12-21", "2027-01-08"))).toBe("21 Dec 2026 – 8 Jan 2027");
  });

  it("adds the year when the leave isn't this year", () => {
    expect(formatLeaveRange(range("2027-03-01", "2027-03-05"), TODAY)).toBe("1 – 5 Mar 2027");
    expect(formatLeaveRange(range("2026-11-03", "2026-11-14"), TODAY)).toBe("3 – 14 Nov");
  });

  it("counts days", () => {
    expect(formatLeaveLength(range("2026-11-03", "2026-11-03"))).toBe("1 day");
    expect(formatLeaveLength(range("2026-11-03", "2026-11-14"))).toBe("12 days");
  });

  it("describes where leave is at", () => {
    expect(describeLeaveStatus(range("2026-10-10", "2026-10-20"), TODAY)).toBe("Away until Tue, 20 Oct");
    expect(describeLeaveStatus(range("2026-10-10", "2026-10-16"), TODAY)).toBe("Away today, back tomorrow");
    expect(describeLeaveStatus(range("2026-11-03", "2026-11-14"), TODAY)).toBe("Starts Tue, 3 Nov");
    expect(describeLeaveStatus(range("2026-10-01", "2026-10-05"), TODAY)).toBe("Back on Tue, 6 Oct");
  });

  it("tells a volunteer what staff changed", () => {
    expect(leaveLoggedNotice({ range: range("2026-11-03", "2026-11-14"), removedShifts: 2, isNew: true })).toEqual({
      title: "Your leave is logged",
      body: "The kitchen has you away 3 – 14 Nov. You're off 2 shifts while you're away. Kia pai tō wā.",
    });
    expect(
      leaveLoggedNotice({ range: range("2026-11-03", "2026-11-03"), removedShifts: 0, isNew: false }).body
    ).toBe("The kitchen has you away Tue, 3 Nov. Kia pai tō wā.");
  });
});
