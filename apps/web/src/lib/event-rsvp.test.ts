import { describe, expect, it } from "vitest";

import { parseDateOnly } from "@/lib/date-only";
import {
  audienceIncludesRole,
  awaitingReply,
  canRespondToEvent,
  eventHasPassed,
  formatEventTime,
  formatEventTimeRange,
  formatEventWhen,
  formatRsvpTally,
  isRsvpResponse,
  rolesForAudience,
  rsvpClosedMessage,
  rsvpClosesOn,
  rsvpsAreOpen,
  summariseRsvps,
  type EventRules,
} from "@/lib/event-rsvp";

const TODAY = "2026-12-01";

function event(overrides: Partial<EventRules> = {}): EventRules {
  return {
    date: parseDateOnly("2026-12-20"),
    status: "PUBLISHED",
    audience: "ALL",
    rsvpEnabled: true,
    rsvpDeadline: null,
    ...overrides,
  };
}

describe("rolesForAudience", () => {
  it("invites volunteers and staff to an ALL event", () => {
    expect(rolesForAudience("ALL")).toEqual([
      "VOLUNTEER",
      "COORDINATOR",
      "ADMIN",
    ]);
  });

  it("narrows to the named group", () => {
    expect(rolesForAudience("VOLUNTEERS")).toEqual(["VOLUNTEER"]);
    expect(rolesForAudience("COORDINATORS")).toEqual(["COORDINATOR", "ADMIN"]);
  });

  it("never includes accounts still mid-application", () => {
    for (const audience of ["ALL", "VOLUNTEERS", "COORDINATORS"] as const) {
      expect(audienceIncludesRole(audience, "PUBLIC")).toBe(false);
    }
  });
});

describe("rsvpClosesOn", () => {
  it("falls back to the day of the event", () => {
    expect(rsvpClosesOn(event())).toBe("2026-12-20");
  });

  it("uses the stated deadline when there is one", () => {
    expect(rsvpClosesOn(event({ rsvpDeadline: parseDateOnly("2026-12-10") }))).toBe(
      "2026-12-10"
    );
  });
});

describe("rsvpsAreOpen", () => {
  it("is open up to and including the closing day", () => {
    const withDeadline = event({ rsvpDeadline: parseDateOnly("2026-12-10") });
    expect(rsvpsAreOpen(withDeadline, "2026-12-10")).toBe(true);
    expect(rsvpsAreOpen(withDeadline, "2026-12-11")).toBe(false);
  });

  it("is closed for drafts, cancellations and save-the-dates", () => {
    expect(rsvpsAreOpen(event({ status: "DRAFT" }), TODAY)).toBe(false);
    expect(rsvpsAreOpen(event({ status: "CANCELLED" }), TODAY)).toBe(false);
    expect(rsvpsAreOpen(event({ rsvpEnabled: false }), TODAY)).toBe(false);
  });
});

describe("canRespondToEvent", () => {
  it("lets an invited volunteer reply", () => {
    expect(canRespondToEvent(event(), "VOLUNTEER", TODAY)).toEqual({ ok: true });
  });

  it("lets staff reply to an event for everyone", () => {
    expect(canRespondToEvent(event(), "COORDINATOR", TODAY)).toEqual({ ok: true });
    expect(canRespondToEvent(event(), "ADMIN", TODAY)).toEqual({ ok: true });
  });

  it("keeps volunteers out of a coordinators-only event", () => {
    const result = canRespondToEvent(
      event({ audience: "COORDINATORS" }),
      "VOLUNTEER",
      TODAY
    );
    expect(result).toEqual({ ok: false, reason: "This event isn't open to you." });
  });

  it("keeps staff out of a volunteers-only event", () => {
    const result = canRespondToEvent(
      event({ audience: "VOLUNTEERS" }),
      "COORDINATOR",
      TODAY
    );
    expect(result.ok).toBe(false);
  });

  it("refuses replies to an unshared draft", () => {
    const result = canRespondToEvent(event({ status: "DRAFT" }), "VOLUNTEER", TODAY);
    expect(result).toEqual({
      ok: false,
      reason: "This event hasn't been shared yet.",
    });
  });

  it("refuses replies once it is cancelled", () => {
    const result = canRespondToEvent(
      event({ status: "CANCELLED" }),
      "VOLUNTEER",
      TODAY
    );
    expect(result).toEqual({
      ok: false,
      reason: "This event has been cancelled.",
    });
  });

  it("refuses replies past the deadline", () => {
    const result = canRespondToEvent(
      event({ rsvpDeadline: parseDateOnly("2026-12-10") }),
      "VOLUNTEER",
      "2026-12-11"
    );
    expect(result).toEqual({
      ok: false,
      reason: "Replies for this event have closed.",
    });
  });

  it("refuses replies after the event itself", () => {
    const result = canRespondToEvent(event(), "VOLUNTEER", "2026-12-21");
    expect(result).toEqual({
      ok: false,
      reason: "This event has already been.",
    });
  });

  it("still takes a reply on the day of the event", () => {
    expect(canRespondToEvent(event(), "VOLUNTEER", "2026-12-20")).toEqual({
      ok: true,
    });
  });

  it("refuses replies when they were never being collected", () => {
    const result = canRespondToEvent(
      event({ rsvpEnabled: false }),
      "VOLUNTEER",
      TODAY
    );
    expect(result).toEqual({
      ok: false,
      reason: "This event isn't taking replies.",
    });
  });
});

describe("eventHasPassed", () => {
  it("counts the day of the event as still to come", () => {
    expect(eventHasPassed(event(), "2026-12-20")).toBe(false);
    expect(eventHasPassed(event(), "2026-12-21")).toBe(true);
  });
});

describe("rsvpClosedMessage", () => {
  it("says nothing while replies are open", () => {
    expect(rsvpClosedMessage(event(), TODAY)).toBeNull();
  });

  it("names the day replies closed", () => {
    expect(
      rsvpClosedMessage(
        event({ rsvpDeadline: parseDateOnly("2026-12-10") }),
        "2026-12-12"
      )
    ).toBe("Replies closed on 10 December.");
  });

  it("explains a cancellation, a past event and a save-the-date", () => {
    expect(rsvpClosedMessage(event({ status: "CANCELLED" }), TODAY)).toBe(
      "This event has been cancelled."
    );
    expect(rsvpClosedMessage(event(), "2026-12-21")).toBe(
      "This event has been and gone."
    );
    expect(rsvpClosedMessage(event({ rsvpEnabled: false }), TODAY)).toBe(
      "Replies aren't being collected for this one."
    );
  });
});

describe("summariseRsvps", () => {
  it("tallies each answer and everyone who replied", () => {
    expect(
      summariseRsvps(["GOING", "GOING", "MAYBE", "NOT_GOING", "GOING"])
    ).toEqual({ going: 3, maybe: 1, notGoing: 1, replied: 5 });
  });

  it("returns zeroes for nobody", () => {
    expect(summariseRsvps([])).toEqual({
      going: 0,
      maybe: 0,
      notGoing: 0,
      replied: 0,
    });
  });
});

describe("awaitingReply", () => {
  it("is the invitees who haven't answered", () => {
    expect(awaitingReply(summariseRsvps(["GOING", "MAYBE"]), 10)).toBe(8);
  });

  it("never goes negative when the invite list has shrunk", () => {
    expect(awaitingReply(summariseRsvps(["GOING", "MAYBE"]), 1)).toBe(0);
  });
});

describe("formatRsvpTally", () => {
  it("always names the going count", () => {
    expect(formatRsvpTally(summariseRsvps([]))).toBe("0 going");
  });

  it("adds maybes only when there are some", () => {
    expect(formatRsvpTally(summariseRsvps(["GOING", "MAYBE"]))).toBe(
      "1 going · 1 maybe"
    );
    expect(formatRsvpTally(summariseRsvps(["GOING", "NOT_GOING"]))).toBe("1 going");
  });
});

describe("time and date formatting", () => {
  it("reads times as a person would", () => {
    expect(formatEventTime("18:00")).toBe("6:00 pm");
    expect(formatEventTime("09:30")).toBe("9:30 am");
    expect(formatEventTime("00:15")).toBe("12:15 am");
    expect(formatEventTime("12:00")).toBe("12:00 pm");
  });

  it("formats a range, a start-only time, and no time at all", () => {
    expect(formatEventTimeRange("18:00", "21:00")).toBe("6:00 pm – 9:00 pm");
    expect(formatEventTimeRange("18:00", null)).toBe("From 6:00 pm");
    expect(formatEventTimeRange(null, null)).toBeNull();
  });

  it("formats the stored day without drifting across midnight", () => {
    expect(
      formatEventWhen({ date: parseDateOnly("2026-12-20"), startTime: "18:00" })
    ).toBe("Sun, 20 Dec 2026, 6:00 pm");
    expect(
      formatEventWhen({ date: parseDateOnly("2026-12-20"), startTime: null })
    ).toBe("Sun, 20 Dec 2026");
  });
});

describe("isRsvpResponse", () => {
  it("accepts the three answers and nothing else", () => {
    expect(isRsvpResponse("GOING")).toBe(true);
    expect(isRsvpResponse("MAYBE")).toBe(true);
    expect(isRsvpResponse("NOT_GOING")).toBe(true);
    expect(isRsvpResponse("going")).toBe(false);
    expect(isRsvpResponse(undefined)).toBe(false);
  });
});
