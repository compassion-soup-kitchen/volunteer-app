import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const profileFindUniqueMock = vi.fn();
const typeFindUniqueMock = vi.fn();
const documentFindUniqueMock = vi.fn();
const documentDeleteMock = vi.fn();
const recordFindUniqueMock = vi.fn();
const recordCreateMock = vi.fn();
const recordDeleteMock = vi.fn();
const storeDocumentMock = vi.fn();
const removeStoredFileMock = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

// Stubbed active so these tests exercise the role gate; `session-account.test.ts`
// covers the account re-read itself.
vi.mock("@/lib/data/session-account", () => ({
  loadSessionAccess: (user: { role: string }) =>
    Promise.resolve({ alive: true, canAct: true, role: user.role }),
}));

vi.mock("@/lib/data/stored-documents", () => ({
  storeDocument: (...args: unknown[]) => storeDocumentMock(...args),
  removeStoredFile: (...args: unknown[]) => removeStoredFileMock(...args),
}));

vi.mock("@/lib/db", () => {
  const build = (): Record<string, unknown> => ({
    volunteerProfile: { findUnique: profileFindUniqueMock },
    trainingType: { findUnique: typeFindUniqueMock },
    document: { findUnique: documentFindUniqueMock, delete: documentDeleteMock },
    trainingRecord: {
      findUnique: recordFindUniqueMock,
      create: recordCreateMock,
      delete: recordDeleteMock,
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(build()),
  });
  return { getDb: build };
});

import {
  attachVolunteerFile,
  recordVolunteerTraining,
  removeTrainingRecord,
  removeVolunteerFile,
} from "./volunteer-record-actions";

const coordinator = { user: { id: "staff-1", role: "COORDINATOR" } };
const volunteer = { user: { id: "vol-1", role: "VOLUNTEER" } };

function form(entries: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const scan = () => new File(["%PDF"], "sheet.pdf", { type: "application/pdf" });

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(coordinator);
  profileFindUniqueMock.mockResolvedValue({ id: "profile-1" });
  typeFindUniqueMock.mockResolvedValue({ isArchived: false });
  storeDocumentMock.mockResolvedValue({ ok: true, documentId: "doc-1" });
});

describe("attachVolunteerFile", () => {
  it("refuses a volunteer", async () => {
    authMock.mockResolvedValue(volunteer);
    const result = await attachVolunteerFile(
      "vol-2",
      form({ type: "MOJ_FORM", file: scan() })
    );
    expect(result).toEqual({ error: "Not authorised." });
    expect(storeDocumentMock).not.toHaveBeenCalled();
  });

  it("refuses an org-wide document type", async () => {
    const result = await attachVolunteerFile(
      "vol-2",
      form({ type: "POLICY", file: scan() })
    );
    expect(result.error).toMatch(/what kind of file/);
    expect(storeDocumentMock).not.toHaveBeenCalled();
  });

  it("stores the file against the volunteer's record", async () => {
    const result = await attachVolunteerFile(
      "vol-2",
      form({ type: "POLICE_VETTING", file: scan() })
    );
    expect(result).toEqual({ success: true });
    expect(storeDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POLICE_VETTING",
        volunteerId: "profile-1",
        uploadedById: "staff-1",
      })
    );
  });
});

describe("removeVolunteerFile", () => {
  it("won't remove a file that isn't on this volunteer's record", async () => {
    // An org-wide policy has no volunteer at all.
    documentFindUniqueMock.mockResolvedValue({
      id: "doc-9",
      fileUrl: "policy/x.pdf",
      volunteer: null,
    });
    const result = await removeVolunteerFile("vol-2", "doc-9");
    expect(result.error).toMatch(/no longer on this record/);
    expect(documentDeleteMock).not.toHaveBeenCalled();
    expect(removeStoredFileMock).not.toHaveBeenCalled();
  });

  it("removes the row, then the stored file", async () => {
    documentFindUniqueMock.mockResolvedValue({
      id: "doc-1",
      fileUrl: "moj_form/x.pdf",
      volunteer: { userId: "vol-2" },
    });
    expect(await removeVolunteerFile("vol-2", "doc-1")).toEqual({ success: true });
    expect(documentDeleteMock).toHaveBeenCalledWith({ where: { id: "doc-1" } });
    expect(removeStoredFileMock).toHaveBeenCalledWith("moj_form/x.pdf");
  });
});

describe("recordVolunteerTraining", () => {
  const valid = { typeId: "type-1", completedOn: "2026-11-03", note: "" };

  it("refuses an archived training type", async () => {
    typeFindUniqueMock.mockResolvedValue({ isArchived: true });
    const result = await recordVolunteerTraining("vol-2", form(valid));
    expect(result.error).toMatch(/no longer offered/);
    expect(recordCreateMock).not.toHaveBeenCalled();
  });

  it("refuses someone with no volunteer record", async () => {
    profileFindUniqueMock.mockResolvedValue(null);
    const result = await recordVolunteerTraining("vol-2", form(valid));
    expect(result.error).toMatch(/no volunteer record/);
  });

  it("saves a record without a scan", async () => {
    expect(await recordVolunteerTraining("vol-2", form(valid))).toEqual({
      success: true,
    });
    expect(recordCreateMock).toHaveBeenCalledWith({
      data: {
        volunteerId: "profile-1",
        typeId: "type-1",
        completedOn: new Date("2026-11-03T00:00:00.000Z"),
        note: null,
        recordedById: "staff-1",
      },
    });
    expect(storeDocumentMock).not.toHaveBeenCalled();
  });

  it("stores the scan as a training sign-off and links the record to it", async () => {
    storeDocumentMock.mockImplementation(async (input) => {
      await input.afterCreate({ trainingRecord: { create: recordCreateMock } }, "doc-7");
      return { ok: true, documentId: "doc-7" };
    });
    const result = await recordVolunteerTraining(
      "vol-2",
      form({ ...valid, file: scan() })
    );
    expect(result).toEqual({ success: true });
    expect(storeDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TRAINING_RECORD", volunteerId: "profile-1" })
    );
    expect(recordCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ documentId: "doc-7", typeId: "type-1" }),
    });
  });

  it("passes an upload failure straight back", async () => {
    storeDocumentMock.mockResolvedValue({ ok: false, error: "That file is empty." });
    const result = await recordVolunteerTraining(
      "vol-2",
      form({ ...valid, file: scan() })
    );
    expect(result).toEqual({ error: "That file is empty." });
  });
});

describe("removeTrainingRecord", () => {
  it("won't remove another volunteer's record", async () => {
    recordFindUniqueMock.mockResolvedValue({
      id: "rec-1",
      volunteer: { userId: "someone-else" },
      document: null,
    });
    const result = await removeTrainingRecord("vol-2", "rec-1");
    expect(result.error).toMatch(/no longer on this record/);
    expect(recordDeleteMock).not.toHaveBeenCalled();
  });

  it("removes the record together with its scan", async () => {
    recordFindUniqueMock.mockResolvedValue({
      id: "rec-1",
      volunteer: { userId: "vol-2" },
      document: { id: "doc-7", fileUrl: "training_record/x.pdf" },
    });
    expect(await removeTrainingRecord("vol-2", "rec-1")).toEqual({ success: true });
    expect(recordDeleteMock).toHaveBeenCalledWith({ where: { id: "rec-1" } });
    expect(documentDeleteMock).toHaveBeenCalledWith({ where: { id: "doc-7" } });
    expect(removeStoredFileMock).toHaveBeenCalledWith("training_record/x.pdf");
  });
});
