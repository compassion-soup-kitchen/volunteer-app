import { describe, expect, it } from "vitest";

import { holdIsLive, parseShiftForm, type ShiftFormData } from "@/lib/shift-form";

const TODAY = "2026-08-25";
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const form = (overrides: Partial<ShiftFormData> = {}): ShiftFormData => ({
  serviceAreaId: "area-kitchen",
  date: "2026-09-01",
  startTime: "09:00",
  endTime: "13:00",
  capacity: 6,
  ...overrides,
});

const parse = (
  data: ShiftFormData,
  existingOffersCloseOn: Date | null = null
) => parseShiftForm(data, { today: TODAY, existingOffersCloseOn });

describe("parseShiftForm", () => {
  it("turns the picked calendar day into the stored midnight-UTC date", () => {
    const result = parse(form());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.date.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("keeps notes as null rather than an empty string", () => {
    const result = parse(form({ notes: "   " }));
    expect(result.ok && result.value.notes).toBeNull();
  });

  it.each([
    ["a missing service area", { serviceAreaId: "" }],
    ["a date that is not a calendar day", { date: "2026-09-01T00:00:00.000Z" }],
    ["a malformed start time", { startTime: "9am" }],
    ["an end time before the start", { startTime: "13:00", endTime: "09:00" }],
    ["a capacity below one", { capacity: 0 }],
    ["a fractional capacity", { capacity: 2.5 }],
    ["a capacity beyond the ceiling", { capacity: 500 }],
  ])("rejects %s", (_label, overrides) => {
    expect(parse(form(overrides as Partial<ShiftFormData>)).ok).toBe(false);
  });

  it("reports the end-time clash in the wording the form shows", () => {
    const result = parse(form({ startTime: "13:00", endTime: "09:00" }));
    expect(result).toEqual({
      ok: false,
      error: "End time must be after start time.",
    });
  });

  describe("first refusal", () => {
    const offered = (overrides: Partial<ShiftFormData> = {}) =>
      form({
        offeredVolunteerIds: ["vol-1", "vol-2"],
        offersCloseOn: "2026-08-28",
        ...overrides,
      });

    it("carries the hold through as a stored date", () => {
      const result = parse(offered());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.offersCloseOn?.toISOString()).toBe(
        "2026-08-28T00:00:00.000Z"
      );
      expect(result.value.offeredVolunteerIds).toEqual(["vol-1", "vol-2"]);
    });

    it("clears the hold when nobody is offered the shift", () => {
      const result = parse(offered({ offeredVolunteerIds: [] }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.offersCloseOn).toBeNull();
      expect(result.value.offeredVolunteerIds).toEqual([]);
    });

    it("asks for a hold day when volunteers are named without one", () => {
      expect(parse(offered({ offersCloseOn: null })).ok).toBe(false);
    });

    it("rejects a hold that outlasts the shift", () => {
      expect(parse(offered({ offersCloseOn: "2026-09-02" })).ok).toBe(false);
    });

    it("rejects a brand-new hold in the past", () => {
      expect(parse(offered({ offersCloseOn: "2026-08-24" })).ok).toBe(false);
    });

    // The regression: a shift whose offer closed days ago is still an
    // ordinary upcoming shift, and fixing its time must not be blocked.
    it("allows an edit that carries a lapsed hold through unchanged", () => {
      const result = parse(
        offered({ offersCloseOn: "2026-08-20", startTime: "17:00", endTime: "20:00" }),
        day("2026-08-20")
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.offersCloseOn?.toISOString()).toBe(
        "2026-08-20T00:00:00.000Z"
      );
      expect(result.value.startTime).toBe("17:00");
    });

    it("still rejects moving a lapsed hold to a different past day", () => {
      expect(
        parse(offered({ offersCloseOn: "2026-08-21" }), day("2026-08-20")).ok
      ).toBe(false);
    });

    it("allows a lapsed hold to be pushed forward to a future day", () => {
      expect(
        parse(offered({ offersCloseOn: "2026-08-30" }), day("2026-08-20")).ok
      ).toBe(true);
    });
  });
});

describe("holdIsLive", () => {
  it("is live through the whole of the closing day", () => {
    expect(holdIsLive(day(TODAY), TODAY)).toBe(true);
  });

  it("is spent once the closing day has passed", () => {
    expect(holdIsLive(day("2026-08-24"), TODAY)).toBe(false);
  });

  it("is never live without a hold", () => {
    expect(holdIsLive(null, TODAY)).toBe(false);
  });
});
