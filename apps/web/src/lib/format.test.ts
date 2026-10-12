import { describe, expect, it } from "vitest";
import { contactLine, formatTime, formatTimeRange, personName } from "./format";

describe("formatTime", () => {
  it("renders morning times without a redundant :00", () => {
    expect(formatTime("09:00")).toBe("9am");
  });

  it("keeps the minutes when they are not on the hour", () => {
    expect(formatTime("13:30")).toBe("1:30pm");
  });

  it("renders midnight and midday as 12", () => {
    expect(formatTime("00:00")).toBe("12am");
    expect(formatTime("12:00")).toBe("12pm");
  });

  it("returns the raw value when it is not a time", () => {
    expect(formatTime("not-a-time")).toBe("not-a-time");
  });
});

describe("formatTimeRange", () => {
  it("joins both ends with an en dash", () => {
    expect(formatTimeRange("09:00", "13:00")).toBe("9am – 1pm");
  });
});

describe("personName", () => {
  it("prefers the name", () => {
    expect(personName({ name: "Aroha Ngata", email: "a@b.nz" })).toBe("Aroha Ngata");
  });

  it("falls back to the email when no name was given", () => {
    expect(personName({ name: "  ", email: "a@b.nz" })).toBe("a@b.nz");
  });

  it("never renders blank for a record with neither", () => {
    expect(personName({ name: null, email: null })).toBe("Unnamed volunteer");
  });
});

describe("contactLine", () => {
  it("prefers the email", () => {
    expect(contactLine({ email: "a@b.nz", phone: "021 555 1234" })).toBe("a@b.nz");
  });

  it("falls back to the phone for an offline volunteer", () => {
    expect(contactLine({ email: null, phone: " 021 555 1234 " })).toBe("021 555 1234");
  });

  it("says so when there is neither", () => {
    expect(contactLine({ email: null, phone: null })).toBe("No email or phone");
  });
});
