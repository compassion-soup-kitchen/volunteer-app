import { describe, expect, it } from "vitest";
import {
  dateOnly,
  emptyDashboard,
  serializeAnnouncement,
  serializeDashboard,
  serializeScheduleEntry,
  serializeShift,
  serializeTrainingSession,
} from "./serializers";

describe("dateOnly", () => {
  it("formats a UTC-midnight date as YYYY-MM-DD", () => {
    expect(dateOnly(new Date("2026-07-18T00:00:00.000Z"))).toBe("2026-07-18");
  });
});

describe("serializeShift", () => {
  it("maps the shift into the mobile wire shape", () => {
    const result = serializeShift({
      id: "shift-1",
      date: new Date("2026-07-18T00:00:00.000Z"),
      startTime: "09:00",
      endTime: "13:00",
      capacity: 6,
      notes: null,
      serviceArea: { id: "area-1", name: "Kitchen" },
      signupCount: 4,
      userSignupId: null,
      userSignupStatus: null,
      offersCloseOn: null,
      heldForOffers: false,
      userOfferStatus: null,
    });

    expect(result).toEqual({
      id: "shift-1",
      date: "2026-07-18",
      startTime: "09:00",
      endTime: "13:00",
      capacity: 6,
      notes: null,
      serviceArea: { id: "area-1", name: "Kitchen" },
      signupCount: 4,
      userSignupId: null,
      userSignupStatus: null,
      offersCloseOn: null,
      heldForOffers: false,
      userOfferStatus: null,
    });
  });

  it("passes the right of first refusal through as calendar days", () => {
    const result = serializeShift({
      id: "shift-1",
      date: new Date("2026-07-18T00:00:00.000Z"),
      startTime: "09:00",
      endTime: "13:00",
      capacity: 6,
      notes: null,
      serviceArea: { id: "area-1", name: "Kitchen" },
      signupCount: 0,
      userSignupId: null,
      userSignupStatus: null,
      offersCloseOn: new Date("2026-07-15T00:00:00.000Z"),
      heldForOffers: true,
      userOfferStatus: "PENDING",
    });

    expect(result).toMatchObject({
      offersCloseOn: "2026-07-15",
      heldForOffers: true,
      userOfferStatus: "PENDING",
    });
  });
});

describe("serializeScheduleEntry", () => {
  it("keeps the roster status and formats the date", () => {
    const result = serializeScheduleEntry({
      id: "shift-2",
      date: new Date("2026-08-01T00:00:00.000Z"),
      startTime: "17:00",
      endTime: "20:00",
      areaName: "Dining service",
      status: "CONFIRMED",
    });

    expect(result.date).toBe("2026-08-01");
    expect(result.status).toBe("CONFIRMED");
  });
});

describe("serializeDashboard", () => {
  it("formats nested shift dates and passes aggregates through", () => {
    const shift = {
      id: "shift-1",
      date: new Date("2026-07-18T00:00:00.000Z"),
      startTime: "09:00",
      endTime: "13:00",
      serviceArea: { id: "area-1", name: "Kitchen" },
      notes: null,
    };

    const result = serializeDashboard({
      nextShift: shift,
      upcomingShifts: [shift],
      openShiftsForYou: [],
      hoursThisMonth: 7.5,
      totalHours: 120,
      mealsThisMonth: 40,
      totalMeals: 900,
      totalShifts: 32,
      milestones: [
        { hours: 10, label: "10 Hours", term: "Whetū", reached: true },
      ],
    });

    expect(result.nextShift?.date).toBe("2026-07-18");
    expect(result.upcomingShifts[0].serviceArea).toEqual({
      id: "area-1",
      name: "Kitchen",
    });
    expect(result.totalHours).toBe(120);
    expect(result.milestones[0].term).toBe("Whetū");
  });
});

describe("emptyDashboard", () => {
  it("returns a zeroed payload with unreached milestones", () => {
    const result = emptyDashboard();
    expect(result.nextShift).toBeNull();
    expect(result.totalHours).toBe(0);
    expect(result.milestones.length).toBeGreaterThan(0);
    expect(result.milestones.every((m) => !m.reached)).toBe(true);
  });
});

describe("serializeTrainingSession", () => {
  const session = {
    id: "ts-1",
    type: { key: "INDUCTION", name: "Induction" },
    title: "Welcome induction",
    description: null,
    date: new Date("2026-07-20T00:00:00.000Z"),
    startTime: "10:00",
    endTime: "12:00",
    capacity: 12,
    location: "Te Pūaroha",
    registeredCount: 3,
    userAttendanceId: null,
    userAttendanceStatus: null,
  };

  it("defaults a missing description to an empty string", () => {
    const result = serializeTrainingSession(session);

    expect(result.description).toBe("");
    expect(result.date).toBe("2026-07-20");
  });

  // Training types became editable rows, but installed apps still match on the
  // key — so `type` must keep being the key, not the display name.
  it("sends the stable key as `type` and the label as `typeName`", () => {
    const result = serializeTrainingSession({
      ...session,
      type: { key: "HEALTH_SAFETY", name: "Food safety" },
    });

    expect(result.type).toBe("HEALTH_SAFETY");
    expect(result.typeName).toBe("Food safety");
  });

  it("keeps the key of a staff-created type", () => {
    const result = serializeTrainingSession({
      ...session,
      type: { key: "FIRST_AID", name: "First aid" },
    });

    expect(result.type).toBe("FIRST_AID");
  });
});

describe("serializeAnnouncement", () => {
  const announcement = {
    id: "a-1",
    title: "Winter roster",
    body: "Kia ora koutou...",
    audience: "VOLUNTEERS" as const,
    sentAt: new Date("2026-07-01T02:30:00.000Z"),
    authorName: null,
    attachments: [],
    event: null,
  };

  it("maps sentAt to publishedAt and falls back on the author name", () => {
    const result = serializeAnnouncement(announcement);

    expect(result.publishedAt).toBe("2026-07-01T02:30:00.000Z");
    expect(result.authorName).toBe("Te Pūaroha");
    expect(result.pinned).toBe(false);
    expect(result.event).toBeNull();
  });

  it("carries the linked event, with the reader's own reply", () => {
    const result = serializeAnnouncement({
      ...announcement,
      event: {
        id: "ev-1",
        title: "Christmas party",
        description: "Kai and waiata.",
        // A `@db.Date` calendar day: it must survive as the 20th, not the 19th.
        date: new Date("2026-12-20T00:00:00.000Z"),
        startTime: "18:00",
        endTime: "21:00",
        location: "132 Tory Street",
        audience: "ALL",
        status: "PUBLISHED",
        rsvpEnabled: true,
        rsvpDeadline: new Date("2026-12-10T00:00:00.000Z"),
        counts: { going: 12, maybe: 3, notGoing: 1, replied: 16 },
        myRsvp: { response: "GOING", note: "Bringing a salad" },
      },
    });

    expect(result.event).toEqual({
      id: "ev-1",
      title: "Christmas party",
      description: "Kai and waiata.",
      date: "2026-12-20",
      startTime: "18:00",
      endTime: "21:00",
      location: "132 Tory Street",
      audience: "ALL",
      status: "PUBLISHED",
      rsvpEnabled: true,
      rsvpDeadline: "2026-12-10",
      goingCount: 12,
      maybeCount: 3,
      myResponse: "GOING",
      myNote: "Bringing a salad",
    });
  });
});
