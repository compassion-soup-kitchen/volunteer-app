/**
 * Shared rules for everything staff upload — policies and training material on
 * /staff/documents, and pānui attachments on /staff/announcements.
 *
 * Kept as pure helpers so both the Server Action and the browser can apply the
 * same limits: the client checks before spending a minute uploading, and the
 * action checks again because the client is never trusted.
 *
 * `MAX_UPLOAD_BYTES` must stay below the `serverActions.bodySizeLimit` set in
 * next.config.ts. Above it, Next rejects the request before the action runs and
 * the person sees a framework error instead of the message below.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** MIME types we accept, mapped to the extensions the file picker offers. */
export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
};

/** The `accept` attribute for a file input, e.g. ".pdf,.png,…". */
export const UPLOAD_ACCEPT_ATTR = Array.from(
  new Set(Object.values(ALLOWED_UPLOAD_TYPES))
).join(",");

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validates a file against the shared limits.
 *
 * Returns the reason it was rejected, or null when it's fine — phrased for a
 * coordinator rather than a developer, since this string goes straight to a
 * toast.
 */
export function checkUploadFile(file: {
  size: number;
  type: string;
  name: string;
}): string | null {
  if (file.size === 0) {
    return "That file is empty.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${formatFileSize(file.size)} — the limit is ${formatFileSize(MAX_UPLOAD_BYTES)}.`;
  }
  if (!ALLOWED_UPLOAD_TYPES[file.type]) {
    return "That file type isn't supported — upload a PDF, Word document, or image.";
  }
  return null;
}

/**
 * A storage key that is safe to round-trip through S3 and back out of a signed
 * URL. The original filename is kept on the row, so mangling here costs nothing
 * and the timestamp keeps same-named uploads from colliding.
 */
export function buildStorageKey(
  prefix: string,
  fileName: string,
  now: number
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-120);
  return `${prefix}/${now}-${safeName}`;
}
