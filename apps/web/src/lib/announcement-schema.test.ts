import { describe, expect, it } from "vitest";
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  announcementPushBody,
  audienceIncludesVolunteers,
  parseAnnouncementInput,
  shouldNotifyVolunteersOnPublish,
} from "./announcement-schema";

const valid = {
  title: "Kitchen closed on Matariki",
  body: "We're closed Friday for Matariki. See you all next week, whānau!",
  audience: "ALL",
};

describe("parseAnnouncementInput", () => {
  it("accepts a valid announcement", () => {
    const result = parseAnnouncementInput(valid);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(valid);
  });

  it("trims whitespace from title and body", () => {
    const result = parseAnnouncementInput({
      ...valid,
      title: "  Kia ora koutou  ",
      body: "  A short note.  ",
    });
    expect(result.data?.title).toBe("Kia ora koutou");
    expect(result.data?.body).toBe("A short note.");
  });

  it("rejects an empty title", () => {
    const result = parseAnnouncementInput({ ...valid, title: "" });
    expect(result.data).toBeUndefined();
    expect(result.error).toMatch(/title/i);
  });

  it("rejects a whitespace-only title", () => {
    const result = parseAnnouncementInput({ ...valid, title: "   " });
    expect(result.error).toMatch(/title/i);
  });

  it("rejects a title over the length bound", () => {
    const result = parseAnnouncementInput({
      ...valid,
      title: "x".repeat(ANNOUNCEMENT_TITLE_MAX + 1),
    });
    expect(result.error).toMatch(/title/i);
  });

  it("accepts a title exactly at the length bound", () => {
    const result = parseAnnouncementInput({
      ...valid,
      title: "x".repeat(ANNOUNCEMENT_TITLE_MAX),
    });
    expect(result.error).toBeUndefined();
  });

  it("rejects an empty body", () => {
    const result = parseAnnouncementInput({ ...valid, body: "" });
    expect(result.error).toMatch(/message/i);
  });

  it("rejects a body over the length bound", () => {
    const result = parseAnnouncementInput({
      ...valid,
      body: "x".repeat(ANNOUNCEMENT_BODY_MAX + 1),
    });
    expect(result.error).toMatch(/message/i);
  });

  it("rejects an invalid audience", () => {
    const result = parseAnnouncementInput({ ...valid, audience: "EVERYONE" });
    expect(result.data).toBeUndefined();
    expect(result.error).toMatch(/who/i);
  });

  it("rejects a missing audience", () => {
    const result = parseAnnouncementInput({
      title: valid.title,
      body: valid.body,
    });
    expect(result.error).toBeDefined();
  });

  it("rejects non-string fields", () => {
    const result = parseAnnouncementInput({ ...valid, title: 42 });
    expect(result.error).toBeDefined();
  });
});

describe("audienceIncludesVolunteers", () => {
  it("includes volunteers for ALL", () => {
    expect(audienceIncludesVolunteers("ALL")).toBe(true);
  });

  it("includes volunteers for VOLUNTEERS", () => {
    expect(audienceIncludesVolunteers("VOLUNTEERS")).toBe(true);
  });

  it("excludes volunteers for COORDINATORS", () => {
    expect(audienceIncludesVolunteers("COORDINATORS")).toBe(false);
  });
});

describe("shouldNotifyVolunteersOnPublish", () => {
  it("notifies on first publish to everyone", () => {
    expect(shouldNotifyVolunteersOnPublish(null, "ALL")).toBe(true);
  });

  it("notifies on first publish to volunteers", () => {
    expect(shouldNotifyVolunteersOnPublish(null, "VOLUNTEERS")).toBe(true);
  });

  it("stays quiet for coordinator-only announcements", () => {
    expect(shouldNotifyVolunteersOnPublish(null, "COORDINATORS")).toBe(false);
  });

  it("stays quiet when the announcement was already published", () => {
    expect(shouldNotifyVolunteersOnPublish(new Date(), "ALL")).toBe(false);
  });
});

describe("announcementPushBody", () => {
  it("returns a short body unchanged", () => {
    expect(announcementPushBody("Kai is served at noon.")).toBe(
      "Kai is served at noon."
    );
  });

  it("collapses newlines and repeated whitespace", () => {
    expect(announcementPushBody("Line one.\n\nLine  two.")).toBe(
      "Line one. Line two."
    );
  });

  it("truncates long bodies with an ellipsis", () => {
    const result = announcementPushBody("word ".repeat(60));
    expect(result.length).toBeLessThanOrEqual(140);
    expect(result.endsWith("…")).toBe(true);
  });
});
