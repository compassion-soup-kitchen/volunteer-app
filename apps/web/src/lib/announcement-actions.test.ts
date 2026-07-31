import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const sendPushMock = vi.fn();
const revalidatePathMock = vi.fn();

const announcementFindManyMock = vi.fn();
const announcementFindUniqueMock = vi.fn();
const announcementCreateMock = vi.fn();
const announcementUpdateMock = vi.fn();
const announcementDeleteMock = vi.fn();
const userFindManyMock = vi.fn();
const deleteFileMock = vi.fn();

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
  // Run the deferred work immediately so push scheduling is observable.
  after: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

// The account-liveness re-read that every Server Action now does (see
// `action-auth.ts`). Stubbed active here so these tests keep exercising the
// auth gate itself; `session-account.test.ts` covers the check.
vi.mock("@/lib/data/session-account", () => ({
  isSessionAccountActive: () => Promise.resolve(true),
}));

vi.mock("@/lib/push", () => ({
  sendPushToUsers: (...args: unknown[]) => sendPushMock(...args),
}));

vi.mock("@/lib/storage", () => ({
  deleteFile: (...args: unknown[]) => deleteFileMock(...args),
  uploadFile: vi.fn(),
  getSignedDownloadUrl: vi.fn(),
  isStorageConfigured: () => true,
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    announcement: {
      findMany: announcementFindManyMock,
      findUnique: announcementFindUniqueMock,
      create: announcementCreateMock,
      update: announcementUpdateMock,
      delete: announcementDeleteMock,
    },
    user: {
      findMany: userFindManyMock,
    },
  }),
}));

import {
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
  deleteAnnouncement,
  getStaffAnnouncements,
} from "./announcement-actions";

const staffSession = {
  user: { id: "staff-1", role: "COORDINATOR" },
};

const volunteerSession = {
  user: { id: "vol-1", role: "VOLUNTEER" },
};

const validInput = {
  title: "Kitchen closed on Matariki",
  body: "We're closed Friday for Matariki.",
  audience: "ALL",
};

beforeEach(() => {
  authMock.mockReset();
  sendPushMock.mockReset();
  revalidatePathMock.mockReset();
  announcementFindManyMock.mockReset();
  announcementFindUniqueMock.mockReset();
  announcementCreateMock.mockReset();
  announcementUpdateMock.mockReset();
  announcementDeleteMock.mockReset();
  userFindManyMock.mockReset();
  deleteFileMock.mockReset().mockResolvedValue(undefined);

  authMock.mockResolvedValue(staffSession);
  userFindManyMock.mockResolvedValue([{ id: "vol-1" }, { id: "vol-2" }]);
  sendPushMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getStaffAnnouncements", () => {
  it("returns an empty list for non-staff users", async () => {
    authMock.mockResolvedValue(volunteerSession);
    const result = await getStaffAnnouncements();
    expect(result).toEqual([]);
    expect(announcementFindManyMock).not.toHaveBeenCalled();
  });

  it("returns all announcements, drafts included, newest first", async () => {
    announcementFindManyMock.mockResolvedValue([
      {
        id: "a1",
        title: "Draft",
        body: "b",
        audience: "ALL",
        createdAt: new Date("2026-07-20"),
        sentAt: null,
        createdBy: { name: "Aroha" },
      },
    ]);

    const result = await getStaffAnnouncements();

    expect(announcementFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } })
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "a1",
        sentAt: null,
        authorName: "Aroha",
      }),
    ]);
  });
});

describe("createAnnouncement", () => {
  it("rejects non-staff users", async () => {
    authMock.mockResolvedValue(volunteerSession);
    const result = await createAnnouncement(validInput);
    expect(result).toEqual({ error: "Not authorised." });
    expect(announcementCreateMock).not.toHaveBeenCalled();
  });

  it("rejects invalid input before touching the database", async () => {
    const result = await createAnnouncement({ ...validInput, title: "" });
    expect(result.error).toMatch(/title/i);
    expect(announcementCreateMock).not.toHaveBeenCalled();
  });

  it("creates a draft without sending a push", async () => {
    announcementCreateMock.mockResolvedValue({ id: "a1", ...validInput });

    const result = await createAnnouncement(validInput);

    // The id comes back so the caller can attach files to what it just made.
    expect(result).toEqual({ success: true, id: "a1" });
    expect(announcementCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: validInput.title,
        audience: "ALL",
        createdById: "staff-1",
        sentAt: null,
      }),
    });
    expect(sendPushMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/staff/announcements");
    expect(revalidatePathMock).toHaveBeenCalledWith("/news");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("publishes immediately and notifies volunteers", async () => {
    announcementCreateMock.mockResolvedValue({ id: "a1", ...validInput });

    const result = await createAnnouncement({ ...validInput, publish: true });

    expect(result).toEqual({ success: true, id: "a1" });
    expect(announcementCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ sentAt: expect.any(Date) }),
    });
    expect(userFindManyMock).toHaveBeenCalledWith({
      where: { role: "VOLUNTEER", status: "ACTIVE" },
      select: { id: true },
    });
    expect(sendPushMock).toHaveBeenCalledWith(["vol-1", "vol-2"], {
      title: validInput.title,
      body: validInput.body,
      data: { url: "/notice/a1" },
    });
  });

  it("does not notify volunteers for coordinator-only announcements", async () => {
    announcementCreateMock.mockResolvedValue({ id: "a1" });

    await createAnnouncement({
      ...validInput,
      audience: "COORDINATORS",
      publish: true,
    });

    expect(sendPushMock).not.toHaveBeenCalled();
  });
});

describe("updateAnnouncement", () => {
  it("updates content without pushing, even when published", async () => {
    announcementFindUniqueMock.mockResolvedValue({
      id: "a1",
      sentAt: new Date(),
      audience: "ALL",
    });
    announcementUpdateMock.mockResolvedValue({ id: "a1" });

    const result = await updateAnnouncement("a1", validInput);

    expect(result).toEqual({ success: true });
    expect(announcementUpdateMock).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: {
        title: validInput.title,
        body: validInput.body,
        audience: "ALL",
      },
    });
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("returns an error when the announcement is missing", async () => {
    announcementFindUniqueMock.mockResolvedValue(null);
    const result = await updateAnnouncement("nope", validInput);
    expect(result).toEqual({ error: "Announcement not found." });
    expect(announcementUpdateMock).not.toHaveBeenCalled();
  });
});

describe("publishAnnouncement", () => {
  it("sets sentAt and notifies volunteers on first publish", async () => {
    announcementFindUniqueMock.mockResolvedValue({
      id: "a1",
      title: "T",
      body: "B",
      audience: "VOLUNTEERS",
      sentAt: null,
    });
    announcementUpdateMock.mockResolvedValue({
      id: "a1",
      title: "T",
      body: "B",
    });

    const result = await publishAnnouncement("a1");

    expect(result).toEqual({ success: true });
    expect(announcementUpdateMock).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { sentAt: expect.any(Date) },
    });
    expect(sendPushMock).toHaveBeenCalledWith(["vol-1", "vol-2"], {
      title: "T",
      body: "B",
      data: { url: "/notice/a1" },
    });
  });

  it("is a no-op for an already published announcement", async () => {
    announcementFindUniqueMock.mockResolvedValue({
      id: "a1",
      sentAt: new Date(),
      audience: "ALL",
    });

    const result = await publishAnnouncement("a1");

    expect(result).toEqual({ success: true });
    expect(announcementUpdateMock).not.toHaveBeenCalled();
    expect(sendPushMock).not.toHaveBeenCalled();
  });
});

describe("unpublishAnnouncement", () => {
  it("clears sentAt", async () => {
    announcementFindUniqueMock.mockResolvedValue({
      id: "a1",
      sentAt: new Date(),
    });
    announcementUpdateMock.mockResolvedValue({ id: "a1" });

    const result = await unpublishAnnouncement("a1");

    expect(result).toEqual({ success: true });
    expect(announcementUpdateMock).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { sentAt: null },
    });
  });
});

describe("deleteAnnouncement", () => {
  it("rejects non-staff users", async () => {
    authMock.mockResolvedValue(volunteerSession);
    const result = await deleteAnnouncement("a1");
    expect(result).toEqual({ error: "Not authorised." });
    expect(announcementDeleteMock).not.toHaveBeenCalled();
  });

  it("deletes an existing announcement", async () => {
    announcementFindUniqueMock.mockResolvedValue({ id: "a1", attachments: [] });
    announcementDeleteMock.mockResolvedValue({ id: "a1" });

    const result = await deleteAnnouncement("a1");

    expect(result).toEqual({ success: true });
    expect(announcementDeleteMock).toHaveBeenCalledWith({
      where: { id: "a1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/news");
  });

  // The attachment rows cascade, but the stored files don't — deleting a pānui
  // has to clear its bucket objects or they linger unreferenced forever.
  it("removes the stored files of a deleted announcement", async () => {
    announcementFindUniqueMock.mockResolvedValue({
      id: "a1",
      attachments: [
        { fileUrl: "announcement/a1/1-roster.pdf" },
        { fileUrl: "announcement/a1/2-menu.pdf" },
      ],
    });
    announcementDeleteMock.mockResolvedValue({ id: "a1" });

    const result = await deleteAnnouncement("a1");

    expect(result).toEqual({ success: true });
    expect(deleteFileMock).toHaveBeenCalledWith("announcement/a1/1-roster.pdf");
    expect(deleteFileMock).toHaveBeenCalledWith("announcement/a1/2-menu.pdf");
  });

  it("still deletes the pānui when a stored file has already gone", async () => {
    announcementFindUniqueMock.mockResolvedValue({
      id: "a1",
      attachments: [{ fileUrl: "announcement/a1/gone.pdf" }],
    });
    announcementDeleteMock.mockResolvedValue({ id: "a1" });
    deleteFileMock.mockRejectedValueOnce(new Error("NoSuchKey"));

    const result = await deleteAnnouncement("a1");

    expect(result).toEqual({ success: true });
    expect(announcementDeleteMock).toHaveBeenCalled();
  });
});
