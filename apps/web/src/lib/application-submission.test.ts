import { describe, expect, it } from "vitest";

import { checkApplicationSubmission } from "./application-submission";

/** What the web form sends when every required step is filled and nothing optional is. */
function minimalSubmission(overrides: Record<string, unknown> = {}) {
  return {
    phone: "021 123 4567",
    address: "1 Cuba Street, Te Aro, Wellington",
    dateOfBirth: "",
    emergencyContactName: "Aroha Smith",
    emergencyContactPhone: "021 765 4321",
    emergencyContactRelationship: "Sister",
    availability: { Monday: ["Morning"] },
    serviceAreaIds: ["area-kitchen"],
    skills: [],
    bio: "",
    agreements: [
      { type: "CODE_OF_CONDUCT", signatureData: "data:image/png;base64,AAAA" },
      { type: "SAFEGUARDING", signatureData: "data:image/png;base64,BBBB" },
    ],
    ...overrides,
  };
}

describe("checkApplicationSubmission", () => {
  it("accepts an application with no date of birth, which the form marks optional", () => {
    const result = checkApplicationSubmission(minimalSubmission());
    expect(result.ok).toBe(true);
  });

  it("accepts a date of birth picked on the form", () => {
    const result = checkApplicationSubmission(
      minimalSubmission({ dateOfBirth: new Date(1990, 4, 17).toISOString() })
    );
    expect(result.ok).toBe(true);
  });

  it("accepts a short phone number, since the form only asks that one is given", () => {
    expect(checkApplicationSubmission(minimalSubmission({ phone: "111" })).ok).toBe(true);
    expect(
      checkApplicationSubmission(minimalSubmission({ emergencyContactPhone: "111" })).ok
    ).toBe(true);
  });

  it("trims what it accepts", () => {
    const result = checkApplicationSubmission(minimalSubmission({ phone: "  021 555  " }));
    expect(result).toMatchObject({ ok: true, data: { phone: "021 555" } });
  });

  it("refuses a date of birth that isn't a date, saying so", () => {
    expect(checkApplicationSubmission(minimalSubmission({ dateOfBirth: "soon" }))).toEqual({
      ok: false,
      error: "Please check your date of birth.",
    });
  });

  it("names the missing field instead of a blanket error", () => {
    expect(checkApplicationSubmission(minimalSubmission({ address: "   " }))).toEqual({
      ok: false,
      error: "Please add your address.",
    });
    expect(
      checkApplicationSubmission(minimalSubmission({ emergencyContactRelationship: "" }))
    ).toEqual({ ok: false, error: "Please say how you know your emergency contact." });
  });

  it("refuses an unknown agreement type", () => {
    const result = checkApplicationSubmission(
      minimalSubmission({ agreements: [{ type: "OTHER", signatureData: "x" }] })
    );
    expect(result.ok).toBe(false);
  });

  it("refuses an oversized signature with something the applicant can do about it", () => {
    const result = checkApplicationSubmission(
      minimalSubmission({
        agreements: [{ type: "CODE_OF_CONDUCT", signatureData: "x".repeat(500_001) }],
      })
    );
    expect(result).toEqual({
      ok: false,
      error: "Your signature is too large - please clear it and sign again.",
    });
  });

  it("refuses something that isn't an application at all", () => {
    expect(checkApplicationSubmission(null).ok).toBe(false);
  });
});
