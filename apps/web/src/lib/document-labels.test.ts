import { describe, expect, it } from "vitest";
import { documentTypeLabel } from "./document-labels";

describe("documentTypeLabel", () => {
  it("names each document type the same way everywhere", () => {
    expect(documentTypeLabel("ID")).toBe("ID document");
    expect(documentTypeLabel("MOJ_FORM")).toBe("MoJ form");
    expect(documentTypeLabel("SIGNED_AGREEMENT")).toBe("Signed agreement");
    expect(documentTypeLabel("POLICY")).toBe("Policy");
    expect(documentTypeLabel("TRAINING_MATERIAL")).toBe("Training material");
  });

  it("falls back to sentence case for an unknown type", () => {
    expect(documentTypeLabel("REFERENCE_LETTER")).toBe("Reference letter");
  });
});
