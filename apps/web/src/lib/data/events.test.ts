import { beforeEach, describe, expect, it, vi } from "vitest";

const eventFindUniqueMock = vi.fn();
const rsvpUpsertMock = vi.fn();
const userFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    event: { findUnique: eventFindUniqueMock },
    eventRsvp: { upsert: rsvpUpsertMock },
    user: { findMany: userFindManyMock },
  }),
}));

import { listEventGuests, respondToEventAsUser } from "@/lib/data/events";
import { RSVP_NOTE_MAX } from "@/lib/event-rsvp";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** An event well in the future, open to everyone. */
function openEvent(overrides: Record<string, unknown> = {}) {
  return {
    date: day("2099-12-20"),
    status: "PUBLISHED",
    audience: "ALL",
    rsvpEnabled: true,
    rsvpDeadline: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rsvpUpsertMock.mockResolvedValue({});
});

describe("respondToEventAsUser", () => {
  it("upserts the reply so changing your mind can't double-count", async () => {
    eventFindUniqueMock.mockResolvedValue(openEvent());

    const result = await respondToEventAsUser(
      "user-1",
      "VOLUNTEER",
      "ev-1",
      "GOING",
      "  Bringing a salad  "
    );

    expect(result).toEqual({ success: true });
    expect(rsvpUpsertMock).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: "ev-1", userId: "user-1" } },
      create: {
        eventId: "ev-1",
        userId: "user-1",
        response: "GOING",
        note: "Bringing a salad",
      },
      update: { response: "GOING", note: "Bringing a salad" },
    });
  });

  it("stores an empty note as nothing at all", async () => {
    eventFindUniqueMock.mockResolvedValue(openEvent());

    await respondToEventAsUser("user-1", "VOLUNTEER", "ev-1", "MAYBE", "   ");

    expect(rsvpUpsertMock.mock.calls[0][0].create.note).toBeNull();
  });

  it("lets staff reply to an event for everyone", async () => {
    eventFindUniqueMock.mockResolvedValue(openEvent());

    expect(
      await respondToEventAsUser("staff-1", "COORDINATOR", "ev-1", "GOING")
    ).toEqual({ success: true });
  });

  it("turns away a reply the audience doesn't cover", async () => {
    eventFindUniqueMock.mockResolvedValue(
      openEvent({ audience: "COORDINATORS" })
    );

    const result = await respondToEventAsUser(
      "user-1",
      "VOLUNTEER",
      "ev-1",
      "GOING"
    );

    expect(result).toEqual({ error: "This event isn't open to you." });
    expect(rsvpUpsertMock).not.toHaveBeenCalled();
  });

  it("turns away a reply to a draft or a cancellation", async () => {
    eventFindUniqueMock.mockResolvedValue(openEvent({ status: "DRAFT" }));
    expect(
      (await respondToEventAsUser("user-1", "VOLUNTEER", "ev-1", "GOING")).error
    ).toBe("This event hasn't been shared yet.");

    eventFindUniqueMock.mockResolvedValue(openEvent({ status: "CANCELLED" }));
    expect(
      (await respondToEventAsUser("user-1", "VOLUNTEER", "ev-1", "GOING")).error
    ).toBe("This event has been cancelled.");

    expect(rsvpUpsertMock).not.toHaveBeenCalled();
  });

  it("turns away a reply once the event has passed", async () => {
    eventFindUniqueMock.mockResolvedValue(openEvent({ date: day("2020-12-20") }));

    expect(
      (await respondToEventAsUser("user-1", "VOLUNTEER", "ev-1", "GOING")).error
    ).toBe("This event has already been.");
  });

  it("rejects an unknown answer without touching the database", async () => {
    const result = await respondToEventAsUser(
      "user-1",
      "VOLUNTEER",
      "ev-1",
      "PROBABLY"
    );

    expect(result).toEqual({ error: "Choose one of the replies." });
    expect(eventFindUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects an over-long note", async () => {
    eventFindUniqueMock.mockResolvedValue(openEvent());

    const result = await respondToEventAsUser(
      "user-1",
      "VOLUNTEER",
      "ev-1",
      "GOING",
      "x".repeat(RSVP_NOTE_MAX + 1)
    );

    expect(result.error).toContain(`${RSVP_NOTE_MAX} characters`);
    expect(rsvpUpsertMock).not.toHaveBeenCalled();
  });

  it("reports a missing event rather than throwing", async () => {
    eventFindUniqueMock.mockResolvedValue(null);

    expect(
      await respondToEventAsUser("user-1", "VOLUNTEER", "gone", "GOING")
    ).toEqual({ error: "Event not found." });
  });
});

describe("listEventGuests", () => {
  it("lists every invitee, with the unanswered last", async () => {
    eventFindUniqueMock.mockResolvedValue({
      audience: "ALL",
      rsvps: [
        {
          userId: "u-3",
          response: "NOT_GOING",
          note: null,
          respondedAt: day("2026-12-02"),
        },
        {
          userId: "u-1",
          response: "GOING",
          note: "Gluten free please",
          respondedAt: day("2026-12-01"),
        },
        {
          userId: "u-2",
          response: "MAYBE",
          note: null,
          respondedAt: day("2026-12-03"),
        },
      ],
    });
    userFindManyMock.mockResolvedValue([
      { id: "u-1", name: "Aroha Mātaira", email: "aroha@x.nz", role: "VOLUNTEER" },
      { id: "u-2", name: "Hana Wīremu", email: "hana@x.nz", role: "COORDINATOR" },
      { id: "u-3", name: "Tama Rangi", email: "tama@x.nz", role: "VOLUNTEER" },
      { id: "u-4", name: "Zoe Clark", email: "zoe@x.nz", role: "VOLUNTEER" },
      { id: "u-5", name: null, email: "no-name@x.nz", role: "VOLUNTEER" },
    ]);

    const guests = await listEventGuests("ev-1");

    expect(guests.map((g) => [g.name, g.response])).toEqual([
      ["Aroha Mātaira", "GOING"],
      ["Hana Wīremu", "MAYBE"],
      ["Tama Rangi", "NOT_GOING"],
      // Yet to answer, alphabetical among themselves — the chase list.
      // Someone with no name shows as their email, and sorts by it.
      ["no-name@x.nz", null],
      ["Zoe Clark", null],
    ]);
    expect(guests[0].note).toBe("Gluten free please");
  });

  it("returns nothing for an event that has gone", async () => {
    eventFindUniqueMock.mockResolvedValue(null);
    expect(await listEventGuests("gone")).toEqual([]);
  });
});
