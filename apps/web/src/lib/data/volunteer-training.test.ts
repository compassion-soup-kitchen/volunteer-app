import { beforeEach, describe, expect, it, vi } from "vitest";

const profileFindUniqueMock = vi.fn();
const attendanceFindManyMock = vi.fn();
const recordFindManyMock = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    volunteerProfile: { findUnique: profileFindUniqueMock },
    trainingAttendance: { findMany: attendanceFindManyMock },
    trainingRecord: { findMany: recordFindManyMock },
  }),
}));

import { getTrainingHistoryForUser } from "./volunteer-training";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const hs = { key: "HEALTH_SAFETY", name: "Health & Safety" };
const induction = { key: "INDUCTION", name: "Induction" };

beforeEach(() => {
  vi.clearAllMocks();
  profileFindUniqueMock.mockResolvedValue({ id: "profile-1" });
  attendanceFindManyMock.mockResolvedValue([
    {
      id: "att-1",
      status: "ATTENDED",
      session: { id: "s1", type: induction, title: "Nau Mai", date: day("2026-10-22") },
    },
  ]);
  recordFindManyMock.mockResolvedValue([
    {
      id: "rec-1",
      completedOn: day("2026-11-05"),
      note: "Private staff note",
      type: hs,
      recordedBy: { name: "Amanda" },
      document: { id: "doc-1", fileName: "sheet.pdf" },
    },
  ]);
});

describe("getTrainingHistoryForUser", () => {
  it("merges recorded training with sessions, newest first, as completed", async () => {
    const history = await getTrainingHistoryForUser("user-1");
    expect(history.map((h) => [h.id, h.source, h.status, h.title])).toEqual([
      ["rec-1", "RECORD", "ATTENDED", "Health & Safety"],
      ["att-1", "SESSION", "ATTENDED", "Nau Mai"],
    ]);
  });

  it("keeps the note, author and scan away from the volunteer's own read", async () => {
    const history = await getTrainingHistoryForUser("user-1");
    expect(history.every((h) => h.record === null)).toBe(true);
    expect(JSON.stringify(history)).not.toContain("Private staff note");
    expect(JSON.stringify(history)).not.toContain("doc-1");
  });

  it("includes the staff-only detail when staff ask for it", async () => {
    const history = await getTrainingHistoryForUser("user-1", { forStaff: true });
    expect(history[0].record).toEqual({
      note: "Private staff note",
      recordedByName: "Amanda",
      document: { id: "doc-1", fileName: "sheet.pdf" },
    });
    // A session has no staff-only detail to show.
    expect(history[1].record).toBeNull();
  });

  it("has nothing for someone without a volunteer record", async () => {
    profileFindUniqueMock.mockResolvedValue(null);
    expect(await getTrainingHistoryForUser("user-1", { forStaff: true })).toEqual([]);
    expect(recordFindManyMock).not.toHaveBeenCalled();
  });
});
