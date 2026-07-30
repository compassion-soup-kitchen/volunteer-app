import { beforeEach, describe, expect, it, vi } from "vitest";

const announcementFindManyMock = vi.fn();
const announcementFindUniqueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    announcement: {
      findMany: announcementFindManyMock,
      findUnique: announcementFindUniqueMock,
    },
  }),
}));

import {
  getVolunteerAnnouncement,
  listVolunteerAnnouncements,
} from "@/lib/data/announcements";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** A published pānui addressed to everyone, announcing `event`. */
function announcement(event: Record<string, unknown> | null) {
  return {
    id: "an-1",
    title: "Kia ora koutou",
    body: "There's a get-together coming up.",
    audience: "ALL",
    sentAt: new Date("2026-07-30T02:30:00.000Z"),
    createdBy: { name: "Hana Wīremu" },
    attachments: [],
    event,
  };
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "ev-1",
    title: "Coordinators' planning hui",
    description: "Rostering for the summer.",
    date: day("2026-12-20"),
    startTime: "10:00",
    endTime: "12:00",
    location: "Upstairs meeting room",
    audience: "ALL",
    status: "PUBLISHED",
    rsvpEnabled: true,
    rsvpDeadline: null,
    rsvps: [{ userId: "u-1", response: "GOING", note: "Bringing a plate" }],
    ...overrides,
  };
}

const volunteer = { userId: "u-1", role: "VOLUNTEER" as const };
const coordinator = { userId: "u-9", role: "COORDINATOR" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listVolunteerAnnouncements", () => {
  it("carries a linked event the reader is invited to", async () => {
    announcementFindManyMock.mockResolvedValue([announcement(event())]);

    const [result] = await listVolunteerAnnouncements({ reader: volunteer });

    expect(result.event?.id).toBe("ev-1");
    expect(result.event?.counts.going).toBe(1);
    // The reader's own reply comes back with it.
    expect(result.event?.myRsvp).toEqual({
      response: "GOING",
      note: "Bringing a plate",
    });
  });

  it("hides an event the reader isn't invited to, pānui and all", async () => {
    // A coordinators-only hui mentioned in a pānui addressed to everyone: the
    // notice is fine to read, its title, place and guest numbers are not.
    announcementFindManyMock.mockResolvedValue([
      announcement(event({ audience: "COORDINATORS" })),
    ]);

    const [asVolunteer] = await listVolunteerAnnouncements({ reader: volunteer });
    expect(asVolunteer.event).toBeNull();
    // The pānui itself still reads normally.
    expect(asVolunteer.title).toBe("Kia ora koutou");

    const [asCoordinator] = await listVolunteerAnnouncements({
      reader: coordinator,
    });
    expect(asCoordinator.event?.id).toBe("ev-1");
  });

  it("hides a volunteers-only event from staff", async () => {
    announcementFindManyMock.mockResolvedValue([
      announcement(event({ audience: "VOLUNTEERS" })),
    ]);

    const [result] = await listVolunteerAnnouncements({ reader: coordinator });
    expect(result.event).toBeNull();
  });

  it("hides a draft event from everyone", async () => {
    announcementFindManyMock.mockResolvedValue([
      announcement(event({ status: "DRAFT" })),
    ]);

    for (const reader of [volunteer, coordinator]) {
      const [result] = await listVolunteerAnnouncements({ reader });
      expect(result.event).toBeNull();
    }
  });

  it("attaches nothing when there is no reader to check against", async () => {
    announcementFindManyMock.mockResolvedValue([announcement(event())]);

    const [result] = await listVolunteerAnnouncements();
    expect(result.event).toBeNull();
  });

  it("leaves an ordinary pānui without an event alone", async () => {
    announcementFindManyMock.mockResolvedValue([announcement(null)]);

    const [result] = await listVolunteerAnnouncements({ reader: volunteer });
    expect(result.event).toBeNull();
    expect(result.authorName).toBe("Hana Wīremu");
  });
});

describe("getVolunteerAnnouncement", () => {
  it("applies the same audience rule as the list", async () => {
    announcementFindUniqueMock.mockResolvedValue(
      announcement(event({ audience: "COORDINATORS" }))
    );

    const asVolunteer = await getVolunteerAnnouncement("an-1", volunteer);
    expect(asVolunteer?.event).toBeNull();

    const asCoordinator = await getVolunteerAnnouncement("an-1", coordinator);
    expect(asCoordinator?.event?.id).toBe("ev-1");
  });

  it("returns null for a coordinators-only pānui", async () => {
    announcementFindUniqueMock.mockResolvedValue({
      ...announcement(event()),
      audience: "COORDINATORS",
    });

    expect(await getVolunteerAnnouncement("an-1", coordinator)).toBeNull();
  });

  it("returns null for a draft pānui", async () => {
    announcementFindUniqueMock.mockResolvedValue({
      ...announcement(event()),
      sentAt: null,
    });

    expect(await getVolunteerAnnouncement("an-1", volunteer)).toBeNull();
  });
});
