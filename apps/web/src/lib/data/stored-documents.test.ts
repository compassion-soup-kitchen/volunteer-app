import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadFileMock = vi.fn();
const deleteFileMock = vi.fn();
const isStorageConfiguredMock = vi.fn();
const documentCreateMock = vi.fn();

vi.mock("@/lib/storage", () => ({
  uploadFile: (...args: unknown[]) => uploadFileMock(...args),
  deleteFile: (...args: unknown[]) => deleteFileMock(...args),
  isStorageConfigured: () => isStorageConfiguredMock(),
}));

vi.mock("@/lib/db", () => {
  const tx = () => ({ document: { create: documentCreateMock } });
  return {
    getDb: () => ({
      $transaction: (fn: (t: unknown) => Promise<unknown>) => fn(tx()),
    }),
  };
});

import { storeDocument } from "./stored-documents";

const pdf = () => new File(["%PDF"], "sheet.pdf", { type: "application/pdf" });
const input = (extra: object = {}) => ({
  file: pdf(),
  type: "TRAINING_RECORD" as const,
  volunteerId: "profile-1",
  uploadedById: "staff-1",
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  isStorageConfiguredMock.mockReturnValue(true);
  uploadFileMock.mockResolvedValue(undefined);
  deleteFileMock.mockResolvedValue(undefined);
  documentCreateMock.mockResolvedValue({ id: "doc-1" });
});

describe("storeDocument", () => {
  it("uploads the file and records it", async () => {
    expect(await storeDocument(input())).toEqual({ ok: true, documentId: "doc-1" });
    const key = uploadFileMock.mock.calls[0][0];
    expect(key).toMatch(/^training_record\/\d+-sheet\.pdf$/);
    expect(documentCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fileUrl: key, volunteerId: "profile-1" }),
      })
    );
    expect(deleteFileMock).not.toHaveBeenCalled();
  });

  it("removes the uploaded object when the row can't be written", async () => {
    documentCreateMock.mockRejectedValue(new Error("db down"));
    const result = await storeDocument(input());
    expect(result).toEqual({ ok: false, error: "Something went wrong. Please try again." });
    expect(deleteFileMock).toHaveBeenCalledWith(uploadFileMock.mock.calls[0][0]);
  });

  it("removes the uploaded object when the linked write fails", async () => {
    const afterCreate = vi.fn().mockRejectedValue(new Error("record failed"));
    const result = await storeDocument(input({ afterCreate }));
    expect(result.ok).toBe(false);
    expect(afterCreate).toHaveBeenCalledWith(expect.anything(), "doc-1");
    expect(deleteFileMock).toHaveBeenCalledWith(uploadFileMock.mock.calls[0][0]);
  });

  it("writes nothing when the upload itself fails", async () => {
    uploadFileMock.mockRejectedValue(new Error("network"));
    const result = await storeDocument(input());
    expect(result).toEqual({
      ok: false,
      error: "The upload didn't reach storage. Please try again.",
    });
    expect(documentCreateMock).not.toHaveBeenCalled();
  });

  it("refuses a file that fails the shared limits before uploading", async () => {
    const empty = new File([], "empty.pdf", { type: "application/pdf" });
    expect(await storeDocument(input({ file: empty }))).toEqual({
      ok: false,
      error: "That file is empty.",
    });
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it("explains when storage isn't configured", async () => {
    isStorageConfiguredMock.mockReturnValue(false);
    const result = await storeDocument(input());
    expect(result.ok).toBe(false);
    expect(uploadFileMock).not.toHaveBeenCalled();
  });
});
