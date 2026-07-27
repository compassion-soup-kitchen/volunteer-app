import { describe, expect, it } from "vitest";

import {
  buildStorageKey,
  checkUploadFile,
  formatFileSize,
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT_ATTR,
} from "./uploads";

const pdf = (size: number, name = "policy.pdf") => ({
  size,
  type: "application/pdf",
  name,
});

describe("checkUploadFile", () => {
  it("accepts a normal PDF", () => {
    expect(checkUploadFile(pdf(2 * 1024 * 1024))).toBeNull();
  });

  it("accepts Word documents and images", () => {
    const types = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    for (const type of types) {
      expect(checkUploadFile({ size: 1024, type, name: "f" })).toBeNull();
    }
  });

  it("rejects an empty file", () => {
    expect(checkUploadFile(pdf(0))).toMatch(/empty/i);
  });

  it("rejects a file over the limit and names the actual size", () => {
    const message = checkUploadFile(pdf(MAX_UPLOAD_BYTES + 1));
    expect(message).toMatch(/10\.0 MB/);
  });

  it("accepts a file exactly at the limit", () => {
    expect(checkUploadFile(pdf(MAX_UPLOAD_BYTES))).toBeNull();
  });

  // The 1 MB Next.js default silently rejected these before bodySizeLimit was
  // raised; anything under our own limit must now pass validation.
  it("accepts the multi-megabyte policy PDFs that used to fail", () => {
    expect(checkUploadFile(pdf(4 * 1024 * 1024))).toBeNull();
  });

  it("rejects an unsupported type", () => {
    expect(
      checkUploadFile({ size: 1024, type: "application/zip", name: "a.zip" })
    ).toMatch(/isn't supported/i);
  });

  it("rejects a file with no detected type", () => {
    expect(checkUploadFile({ size: 1024, type: "", name: "mystery" })).not.toBe(
      null
    );
  });
});

describe("formatFileSize", () => {
  it("scales the unit to the size", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("UPLOAD_ACCEPT_ATTR", () => {
  it("lists each extension once", () => {
    const parts = UPLOAD_ACCEPT_ATTR.split(",");
    expect(new Set(parts).size).toBe(parts.length);
    expect(parts).toContain(".pdf");
    expect(parts).toContain(".docx");
  });
});

describe("buildStorageKey", () => {
  it("namespaces by prefix and timestamps the name", () => {
    expect(buildStorageKey("policy", "code.pdf", 1700000000000)).toBe(
      "policy/1700000000000-code.pdf"
    );
  });

  it("strips characters that would break the key", () => {
    const key = buildStorageKey("policy", "Te Pūaroha / v2 (final).pdf", 1);
    expect(key).toBe("policy/1-Te_P_aroha___v2__final_.pdf");
    expect(key).not.toMatch(/[^a-zA-Z0-9./_-]/);
  });

  it("keeps very long names within a sane length", () => {
    const key = buildStorageKey("policy", `${"a".repeat(400)}.pdf`, 1);
    expect(key.length).toBeLessThanOrEqual("policy/1-".length + 120);
    expect(key.endsWith(".pdf")).toBe(true);
  });
});
