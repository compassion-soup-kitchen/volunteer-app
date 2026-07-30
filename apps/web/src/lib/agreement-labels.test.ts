import { describe, expect, it } from "vitest";
import { agreementLabel } from "./agreement-labels";

describe("agreementLabel", () => {
  it("names each agreement the same way everywhere", () => {
    expect(agreementLabel("CODE_OF_CONDUCT")).toBe("Te Tikanga · Code of Conduct");
    expect(agreementLabel("SAFEGUARDING")).toBe("Safeguarding Policy");
    expect(agreementLabel("VOLUNTEER_APPLICATION")).toBe(
      "Volunteer Application Agreement"
    );
    expect(agreementLabel("POLICIES")).toBe("General Policies");
  });

  // A type added to the enum before the copy catches up should still read as
  // English, not as a database constant.
  it("prefers the template's own title for an unknown type", () => {
    expect(agreementLabel("MEDIA_CONSENT", "Photo & media consent")).toBe(
      "Photo & media consent"
    );
  });

  it("falls back to sentence case when there is no title either", () => {
    expect(agreementLabel("MEDIA_CONSENT")).toBe("Media consent");
    expect(agreementLabel("MEDIA_CONSENT", "")).toBe("Media consent");
  });

  it("keeps the shared name even when a title is passed", () => {
    expect(agreementLabel("SAFEGUARDING", "Safeguarding v2")).toBe(
      "Safeguarding Policy"
    );
  });
});
