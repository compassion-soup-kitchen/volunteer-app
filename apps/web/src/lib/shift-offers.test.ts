import { describe, expect, it } from "vitest";

import {
  formatHoldUntil,
  heldForOffersMessage,
  isHeldForOffers,
  offerIsLive,
  resolveOfferWindow,
  type FirstRefusalState,
} from "@/lib/shift-offers";

// Shift.date and Shift.offersCloseOn are @db.Date — midnight UTC, no time.
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

// 09:00 on Tuesday 25 August in Wellington (UTC+12).
const now = new Date("2026-08-24T21:00:00.000Z");

const held = (overrides: Partial<FirstRefusalState> = {}): FirstRefusalState => ({
  offersCloseOn: day("2026-08-27"),
  offers: [{ status: "PENDING" }, { status: "PENDING" }],
  ...overrides,
});

describe("isHeldForOffers", () => {
  it("holds the shift while someone offered it has yet to answer", () => {
    expect(isHeldForOffers(held(), now)).toBe(true);
  });

  it("holds it through the whole of the closing day", () => {
    expect(
      isHeldForOffers(held({ offersCloseOn: day("2026-08-25") }), now)
    ).toBe(true);
  });

  it("releases it once the closing day has passed", () => {
    expect(
      isHeldForOffers(held({ offersCloseOn: day("2026-08-24") }), now)
    ).toBe(false);
  });

  it("releases it early once everyone offered has answered", () => {
    expect(
      isHeldForOffers(
        held({ offers: [{ status: "ACCEPTED" }, { status: "DECLINED" }] }),
        now
      )
    ).toBe(false);
  });

  it("keeps holding while one of several is still deciding", () => {
    expect(
      isHeldForOffers(
        held({ offers: [{ status: "DECLINED" }, { status: "PENDING" }] }),
        now
      )
    ).toBe(true);
  });

  it("never holds a shift with no first refusal set", () => {
    expect(
      isHeldForOffers({ offersCloseOn: null, offers: [{ status: "PENDING" }] }, now)
    ).toBe(false);
  });

  it("never holds a shift nobody was offered", () => {
    expect(isHeldForOffers(held({ offers: [] }), now)).toBe(false);
  });

  it("is still holding in the Aotearoa morning after UTC has rolled over", () => {
    // 21:00 UTC on the 27th is 09:00 on the 28th in Wellington, so a hold
    // through the 27th is spent — but a hold through the 28th is not.
    const nzMorningOfThe28th = new Date("2026-08-27T21:00:00.000Z");
    expect(
      isHeldForOffers(held({ offersCloseOn: day("2026-08-28") }), nzMorningOfThe28th)
    ).toBe(true);
    expect(
      isHeldForOffers(held({ offersCloseOn: day("2026-08-27") }), nzMorningOfThe28th)
    ).toBe(false);
  });
});

describe("offerIsLive", () => {
  it("is live for a pending offer on a held shift", () => {
    expect(offerIsLive({ status: "PENDING" }, held(), now)).toBe(true);
  });

  it("is not live once the volunteer has answered", () => {
    expect(offerIsLive({ status: "DECLINED" }, held(), now)).toBe(false);
  });

  it("is not live once the hold has lapsed", () => {
    expect(
      offerIsLive(
        { status: "PENDING" },
        held({ offersCloseOn: day("2026-08-20") }),
        now
      )
    ).toBe(false);
  });

  it("is not live for a volunteer who was never offered the shift", () => {
    expect(offerIsLive(null, held(), now)).toBe(false);
  });
});

describe("resolveOfferWindow", () => {
  const base = {
    shiftDate: "2026-09-01",
    offersCloseOn: "2026-08-28",
    volunteerIds: ["v1", "v2"],
    today: "2026-08-25",
  };

  it("accepts a hold ending before the shift", () => {
    expect(resolveOfferWindow(base)).toEqual({
      ok: true,
      offersCloseOn: "2026-08-28",
      volunteerIds: ["v1", "v2"],
    });
  });

  it("accepts a hold ending on the day of the shift", () => {
    expect(
      resolveOfferWindow({ ...base, offersCloseOn: "2026-09-01" })
    ).toMatchObject({ ok: true, offersCloseOn: "2026-09-01" });
  });

  it("drops duplicate volunteers", () => {
    expect(
      resolveOfferWindow({ ...base, volunteerIds: ["v1", "v1", "v2"] })
    ).toMatchObject({ ok: true, volunteerIds: ["v1", "v2"] });
  });

  it("clears the hold day when nobody is offered the shift", () => {
    expect(resolveOfferWindow({ ...base, volunteerIds: [] })).toEqual({
      ok: true,
      offersCloseOn: null,
      volunteerIds: [],
    });
  });

  it("asks for a hold day when volunteers are named without one", () => {
    expect(resolveOfferWindow({ ...base, offersCloseOn: null })).toMatchObject({
      ok: false,
    });
  });

  it("rejects a hold day after the shift itself", () => {
    expect(
      resolveOfferWindow({ ...base, offersCloseOn: "2026-09-02" })
    ).toMatchObject({ ok: false });
  });

  it("rejects a hold day already in the past", () => {
    expect(
      resolveOfferWindow({ ...base, offersCloseOn: "2026-08-24" })
    ).toMatchObject({ ok: false });
  });

  it("accepts a hold ending today", () => {
    expect(
      resolveOfferWindow({ ...base, offersCloseOn: "2026-08-25" })
    ).toMatchObject({ ok: true });
  });
});

describe("formatHoldUntil / heldForOffersMessage", () => {
  it("names the closing day the way the roster reads it", () => {
    expect(formatHoldUntil(day("2026-08-28"))).toBe("Friday, 28 August");
  });

  it("explains the hold without naming who holds it", () => {
    const message = heldForOffersMessage(day("2026-08-28"));
    expect(message).toContain("Friday, 28 August");
    expect(message).toContain("opens to everyone");
  });
});
