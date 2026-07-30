import { describe, expect, it } from "vitest";

import { dateOnlyOf, parseDateOnly } from "@/lib/date-only";
import { parseEventForm, type EventFormData } from "@/lib/event-form";

const TODAY = "2026-12-01";

function form(overrides: Partial<EventFormData> = {}): EventFormData {
  return {
    title: "Christmas party",
    description: "Kai, waiata and a Secret Santa.",
    date: "2026-12-20",
    startTime: "18:00",
    endTime: "21:00",
    location: "132 Tory Street",
    audience: "ALL",
    rsvpEnabled: true,
    rsvpDeadline: "2026-12-10",
    ...overrides,
  };
}

function parse(overrides: Partial<EventFormData> = {}, existing?: {
  date: Date;
  rsvpDeadline: Date | null;
}) {
  return parseEventForm(form(overrides), { today: TODAY, existing });
}

describe("parseEventForm", () => {
  it("resolves calendar days to their stored midnight-UTC form", () => {
    const result = parse();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(dateOnlyOf(result.value.date)).toBe("2026-12-20");
    expect(result.value.rsvpDeadline).not.toBeNull();
    expect(dateOnlyOf(result.value.rsvpDeadline!)).toBe("2026-12-10");
    expect(result.value.date.toISOString()).toBe("2026-12-20T00:00:00.000Z");
  });

  it("trims text and turns blanks into nulls", () => {
    const result = parse({
      title: "  Christmas party  ",
      description: "   ",
      location: "",
      startTime: "",
      endTime: "",
      rsvpDeadline: "",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("Christmas party");
    expect(result.value.description).toBeNull();
    expect(result.value.location).toBeNull();
    expect(result.value.startTime).toBeNull();
    expect(result.value.endTime).toBeNull();
    expect(result.value.rsvpDeadline).toBeNull();
  });

  it("needs a name and a day", () => {
    expect(parse({ title: "  " })).toEqual({
      ok: false,
      error: "Give the event a name.",
    });
    expect(parse({ date: "" })).toEqual({
      ok: false,
      error: "Choose the day the event is on.",
    });
  });

  it("refuses an end time before the start, or without one", () => {
    expect(parse({ startTime: "21:00", endTime: "18:00" })).toEqual({
      ok: false,
      error: "The end time must be after the start time.",
    });
    expect(parse({ startTime: "", endTime: "21:00" })).toEqual({
      ok: false,
      error: "Add a start time as well as an end time.",
    });
  });

  it("accepts a start time with no end time", () => {
    const result = parse({ endTime: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.startTime).toBe("18:00");
    expect(result.value.endTime).toBeNull();
  });

  it("rejects a malformed time", () => {
    expect(parse({ startTime: "6pm" }).ok).toBe(false);
    expect(parse({ startTime: "25:00" }).ok).toBe(false);
  });

  it("refuses to create an event in the past", () => {
    expect(parse({ date: "2026-11-30", rsvpDeadline: "" })).toEqual({
      ok: false,
      error: "The event date is in the past.",
    });
  });

  it("lets a past event be edited as long as the date isn't moved", () => {
    const existing = { date: parseDateOnly("2025-12-20"), rsvpDeadline: null };
    expect(parse({ date: "2025-12-20", rsvpDeadline: "" }, existing).ok).toBe(true);
    // Moving it to a *different* past day is still a mistake.
    expect(parse({ date: "2025-12-19", rsvpDeadline: "" }, existing).ok).toBe(false);
  });

  it("keeps the reply deadline on or before the event", () => {
    expect(parse({ rsvpDeadline: "2026-12-21" })).toEqual({
      ok: false,
      error: "Replies must close on or before the event.",
    });
    expect(parse({ rsvpDeadline: "2026-12-20" }).ok).toBe(true);
  });

  it("refuses a new reply deadline that has already passed", () => {
    expect(parse({ rsvpDeadline: "2026-11-20" })).toEqual({
      ok: false,
      error: "The reply-by date is in the past.",
    });
  });

  it("carries a lapsed reply deadline through an edit untouched", () => {
    const existing = {
      date: parseDateOnly("2026-12-20"),
      rsvpDeadline: parseDateOnly("2026-11-20"),
    };
    expect(parse({ rsvpDeadline: "2026-11-20" }, existing).ok).toBe(true);
  });

  it("won't collect a reply-by date with replies turned off", () => {
    expect(parse({ rsvpEnabled: false })).toEqual({
      ok: false,
      error: "Turn replies on, or clear the reply-by date.",
    });
    expect(parse({ rsvpEnabled: false, rsvpDeadline: "" }).ok).toBe(true);
  });

  it("only accepts the known audiences", () => {
    expect(parse({ audience: "EVERYONE" })).toEqual({
      ok: false,
      error: "Choose who's invited.",
    });
    const result = parse({ audience: "VOLUNTEERS" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.audience).toBe("VOLUNTEERS");
  });

  it("caps the long fields", () => {
    expect(parse({ title: "x".repeat(121) }).ok).toBe(false);
    expect(parse({ description: "x".repeat(5001) }).ok).toBe(false);
    expect(parse({ location: "x".repeat(201) }).ok).toBe(false);
  });
});
