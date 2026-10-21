import { describe, expect, it } from "vitest";
import {
  contactLine,
  formatDateOfBirth,
  formatTime,
  formatTimeRange,
  formatTimestamp,
  formatTimestampWithTime,
  personName,
} from "./format";

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

// Pinned instants, so these hold whatever TZ the suite runs under: the
// assertions are about Wellington, never the machine's clock.
// 2026-10-20T20:15Z is 9:15am on Wednesday 21 October in Wellington (NZDT,
// UTC+13), while UTC and Los Angeles are both still on the 20th.
const NZ_MORNING = new Date("2026-10-20T20:15:00.000Z");

describe("formatTimestamp", () => {
  it("names the NZ day, not the server's or the browser's", () => {
    expect(formatTimestamp(NZ_MORNING)).toBe("21 Oct 2026");
  });

  it("accepts the ISO string a timestamp arrives as over the wire", () => {
    expect(formatTimestamp(NZ_MORNING.toISOString())).toBe("21 Oct 2026");
  });

  it("follows the winter offset as well as daylight saving", () => {
    // 21:00Z on 30 June is 9am on 1 July in Wellington (NZST, UTC+12).
    expect(formatTimestamp(new Date("2026-06-30T21:00:00.000Z"))).toBe(
      "1 Jul 2026"
    );
  });
});

describe("formatTimestampWithTime", () => {
  it("adds the NZ time in the same style as shift times", () => {
    expect(formatTimestampWithTime(NZ_MORNING)).toBe("21 Oct 2026 at 9:15am");
  });

  it("drops the minutes on the hour", () => {
    expect(
      formatTimestampWithTime(new Date("2026-10-21T01:00:00.000Z"))
    ).toBe("21 Oct 2026 at 2pm");
  });

  it("reads NZ midnight as 12am on the new day", () => {
    expect(
      formatTimestampWithTime(new Date("2026-10-20T11:00:00.000Z"))
    ).toBe("21 Oct 2026 at 12am");
  });
});

describe("formatDateOfBirth", () => {
  it("reads the stored day back unchanged", () => {
    expect(formatDateOfBirth(new Date("1990-07-01T00:00:00.000Z"))).toBe(
      "1 July 1990"
    );
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
