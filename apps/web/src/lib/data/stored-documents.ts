import type { DocumentType, Prisma } from "@prisma/client";

import { getDb } from "@/lib/db";
import { deleteFile, isStorageConfigured, uploadFile } from "@/lib/storage";
import { buildStorageKey, checkUploadFile } from "@/lib/uploads";

type Tx = Prisma.TransactionClient;

export type StoreDocumentResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

/**
 * Puts a file in the bucket and records it as a `Document` - the one way a
 * staff upload becomes a stored file, whether it's an org-wide policy or a
 * scan on one volunteer's record.
 *
 * Returns failures as copy for a coordinator rather than throwing: an uncaught
 * throw in a Server Action reaches the browser as an opaque "unexpected error".
 *
 * `afterCreate` runs in the same transaction as the row, so anything that
 * points at the new document (a training record) lands with it or not at all;
 * if either fails the uploaded object is removed again rather than orphaned.
 */
export async function storeDocument(input: {
  file: File;
  type: DocumentType;
  volunteerId: string | null;
  uploadedById: string;
  afterCreate?: (tx: Tx, documentId: string) => Promise<void>;
}): Promise<StoreDocumentResult> {
  if (!isStorageConfigured()) {
    console.error("storeDocument: S3 storage env vars are not configured");
    return {
      ok: false,
      error:
        "File storage isn't set up on the server yet. Let your administrator know.",
    };
  }

  const rejection = checkUploadFile(input.file);
  if (rejection) return { ok: false, error: rejection };

  const storagePath = buildStorageKey(
    input.type.toLowerCase(),
    input.file.name,
    Date.now()
  );

  try {
    const buffer = Buffer.from(await input.file.arrayBuffer());
    await uploadFile(storagePath, buffer, input.file.type);
  } catch (err) {
    console.error("storeDocument: storage upload failed", err);
    return { ok: false, error: "The upload didn't reach storage. Please try again." };
  }

  try {
    const documentId = await getDb().$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          type: input.type,
          fileName: input.file.name,
          fileUrl: storagePath,
          volunteerId: input.volunteerId,
          uploadedById: input.uploadedById,
        },
        select: { id: true },
      });
      await input.afterCreate?.(tx, doc.id);
      return doc.id;
    });
    return { ok: true, documentId };
  } catch (err) {
    console.error("storeDocument: could not record the document", err);
    await deleteFile(storagePath).catch(() => {});
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Removes a document's row, then its bucket object. The row goes first: a file
 * left behind is invisible clutter, a row left pointing at nothing is a broken
 * download. A failed bucket delete is logged, not thrown.
 */
export async function removeStoredDocument(doc: {
  id: string;
  fileUrl: string;
}): Promise<void> {
  await getDb().document.delete({ where: { id: doc.id } });
  await removeStoredFile(doc.fileUrl);
}

/** The bucket half of a removal, for callers that delete the row themselves. */
export async function removeStoredFile(fileUrl: string): Promise<void> {
  await deleteFile(fileUrl).catch((err) => {
    console.error("removeStoredFile: could not remove the stored file", err);
  });
}
