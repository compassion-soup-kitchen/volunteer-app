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
  it("defaults a missing description to an empty string", () => {
    const result = serializeTrainingSession({
      id: "ts-1",
      type: "INDUCTION",
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
    });

    expect(result.description).toBe("");
    expect(result.date).toBe("2026-07-20");
  });
});

describe("serializeAnnouncement", () => {
  it("maps sentAt to publishedAt and falls back on the author name", () => {
    const result = serializeAnnouncement({
      id: "a-1",
      title: "Winter roster",
      body: "Kia ora koutou...",
      audience: "VOLUNTEERS",
      sentAt: new Date("2026-07-01T02:30:00.000Z"),
      authorName: null,
    });

    expect(result.publishedAt).toBe("2026-07-01T02:30:00.000Z");
    expect(result.authorName).toBe("Te Pūaroha");
    expect(result.pinned).toBe(false);
  });
});
