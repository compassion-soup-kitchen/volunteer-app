import { describe, expect, it } from "vitest";

import { canDownloadDocument, ORG_FILE_TYPES } from "./document-access";
import { VOLUNTEER_FILE_TYPES } from "./training-records";

const staff = { isStaff: true };
const volunteer = { isStaff: false };

describe("canDownloadDocument", () => {
  it("lets staff open anything", () => {
    expect(canDownloadDocument(staff, { type: "POLICE_VETTING", volunteerId: "p1" })).toBe(true);
    expect(canDownloadDocument(staff, { type: "POLICY", volunteerId: null })).toBe(true);
  });

  it("lets a volunteer open org-wide policies and training material", () => {
    expect(canDownloadDocument(volunteer, { type: "POLICY", volunteerId: null })).toBe(true);
    expect(canDownloadDocument(volunteer, { type: "TRAINING_MATERIAL", volunteerId: null })).toBe(true);
  });

  it("keeps files on a volunteer's record staff-only, even from that volunteer", () => {
    for (const type of ["TRAINING_RECORD", "POLICE_VETTING", "MOJ_FORM", "ID", "OTHER"]) {
      expect(canDownloadDocument(volunteer, { type, volunteerId: "p1" })).toBe(false);
    }
  });

  it("refuses org-level files that aren't meant for volunteers", () => {
    expect(canDownloadDocument(volunteer, { type: "SIGNED_AGREEMENT", volunteerId: null })).toBe(false);
  });
});

describe("ORG_FILE_TYPES", () => {
  it("never overlaps the kinds of file kept on one volunteer's record", () => {
    for (const type of ORG_FILE_TYPES) {
      expect((VOLUNTEER_FILE_TYPES as readonly string[]).includes(type)).toBe(false);
    }
  });
});
