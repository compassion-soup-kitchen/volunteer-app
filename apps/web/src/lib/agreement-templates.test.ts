import { describe, expect, it } from "vitest";
import {
  agreementKeyFromTitle,
  isCurrentVersion,
  needsAcknowledgement,
  tallyAgreement,
  uniqueAgreementKey,
  validateAgreementTemplate,
} from "./agreement-templates";

const template = {
  version: "1.0",
  requiresReAck: false,
  reAckSetAt: null as Date | null,
};

describe("agreementKeyFromTitle", () => {
  it("matches the convention of the agreements that predate this", () => {
    expect(agreementKeyFromTitle("Code of Conduct")).toBe("CODE_OF_CONDUCT");
    expect(agreementKeyFromTitle("Safeguarding Policy")).toBe(
      "SAFEGUARDING_POLICY"
    );
  });

  it("folds punctuation and runs of separators into one underscore", () => {
    expect(agreementKeyFromTitle("Te Tikanga · Code of Conduct")).toBe(
      "TE_TIKANGA_CODE_OF_CONDUCT"
    );
    expect(agreementKeyFromTitle("  Health & Safety  ")).toBe("HEALTH_SAFETY");
  });

  it("keeps macronised titles readable instead of dropping the vowel", () => {
    expect(agreementKeyFromTitle("Pānui Policy")).toBe("PANUI_POLICY");
  });

  it("never returns an empty key", () => {
    expect(agreementKeyFromTitle("···")).toBe("AGREEMENT");
    expect(agreementKeyFromTitle("")).toBe("AGREEMENT");
  });

  it("does not leave a trailing underscore after truncating", () => {
    const key = agreementKeyFromTitle("A".repeat(63) + " tail");
    expect(key.endsWith("_")).toBe(false);
    expect(key.length).toBeLessThanOrEqual(64);
  });
});

describe("uniqueAgreementKey", () => {
  it("uses the plain key when it is free", () => {
    expect(uniqueAgreementKey("Media Consent", ["SAFEGUARDING"])).toBe(
      "MEDIA_CONSENT"
    );
  });

  it("steps past keys already in use", () => {
    expect(
      uniqueAgreementKey("Media Consent", ["MEDIA_CONSENT", "MEDIA_CONSENT_2"])
    ).toBe("MEDIA_CONSENT_3");
  });

  it("stays within the key length while stepping", () => {
    const long = "A".repeat(70);
    const taken = [agreementKeyFromTitle(long)];
    const key = uniqueAgreementKey(long, taken);
    expect(key.length).toBeLessThanOrEqual(64);
    expect(taken).not.toContain(key);
  });
});

describe("needsAcknowledgement", () => {
  it("is true when they have never acknowledged it", () => {
    expect(needsAcknowledgement(template, null)).toBe(true);
  });

  it("is false for a bare version bump - staff fix typos", () => {
    expect(
      needsAcknowledgement(
        { ...template, version: "2.0" },
        { documentVersion: "1.0", signedAt: new Date("2026-01-01") }
      )
    ).toBe(false);
  });

  it("is true when their tick predates the re-acknowledgement request", () => {
    expect(
      needsAcknowledgement(
        {
          ...template,
          requiresReAck: true,
          reAckSetAt: new Date("2026-06-01"),
        },
        { documentVersion: "1.0", signedAt: new Date("2026-01-01") }
      )
    ).toBe(true);
  });

  it("is false once they have ticked since the request", () => {
    expect(
      needsAcknowledgement(
        {
          ...template,
          requiresReAck: true,
          reAckSetAt: new Date("2026-06-01"),
        },
        { documentVersion: "1.0", signedAt: new Date("2026-07-01") }
      )
    ).toBe(false);
  });

  it("ignores a stale reAckSetAt once the flag is switched off", () => {
    expect(
      needsAcknowledgement(
        { ...template, requiresReAck: false, reAckSetAt: new Date("2026-06-01") },
        { documentVersion: "1.0", signedAt: new Date("2026-01-01") }
      )
    ).toBe(false);
  });
});

describe("isCurrentVersion", () => {
  it("compares against the published version", () => {
    const latest = { documentVersion: "1.0", signedAt: new Date() };
    expect(isCurrentVersion({ version: "1.0" }, latest)).toBe(true);
    expect(isCurrentVersion({ version: "2.0" }, latest)).toBe(false);
  });

  it("treats a signature with no recorded version as not current", () => {
    expect(
      isCurrentVersion(
        { version: "1.0" },
        { documentVersion: null, signedAt: new Date() }
      )
    ).toBe(false);
  });
});

describe("tallyAgreement", () => {
  it("adds up to the number of people it applies to", () => {
    const tally = tallyAgreement({ ...template, version: "2.0" }, [
      { documentVersion: "2.0", signedAt: new Date("2026-06-01") },
      { documentVersion: "1.0", signedAt: new Date("2026-01-01") },
      null,
    ]);

    expect(tally).toMatchObject({
      totalVolunteers: 3,
      signedCurrentCount: 1,
      signedOutdatedCount: 1,
      unsignedCount: 1,
    });
  });

  it("cannot report more signatures than volunteers", () => {
    // The old bug: signatures were drawn from a wider population than the
    // denominator, so the page read "8 / 6".
    const tally = tallyAgreement(template, [
      { documentVersion: "1.0", signedAt: new Date() },
      { documentVersion: "1.0", signedAt: new Date() },
    ]);

    expect(tally.signedCurrentCount).toBeLessThanOrEqual(tally.totalVolunteers);
    expect(tally.unsignedCount).toBe(0);
  });

  it("counts nobody as pending until staff ask for a re-acknowledgement", () => {
    const signed = [{ documentVersion: "1.0", signedAt: new Date("2026-01-01") }];
    expect(tallyAgreement(template, signed).pendingReAckCount).toBe(0);
    expect(
      tallyAgreement(
        { ...template, requiresReAck: true, reAckSetAt: new Date("2026-06-01") },
        signed
      ).pendingReAckCount
    ).toBe(1);
  });

  it("handles an agreement nobody applies to", () => {
    expect(tallyAgreement(template, [])).toMatchObject({
      totalVolunteers: 0,
      signedCurrentCount: 0,
      unsignedCount: 0,
      pendingReAckCount: 0,
    });
  });
});

describe("validateAgreementTemplate", () => {
  const valid = {
    title: "Media Consent",
    content: "I agree to ...",
    version: "1.0",
    requiresSignature: false,
  };

  it("accepts a complete agreement", () => {
    expect(validateAgreementTemplate(valid)).toBeNull();
  });

  it("rejects a blank title, body or version", () => {
    expect(validateAgreementTemplate({ ...valid, title: "  " })).toMatch(
      /title/i
    );
    expect(validateAgreementTemplate({ ...valid, content: "" })).toMatch(
      /wording/i
    );
    expect(validateAgreementTemplate({ ...valid, version: "" })).toMatch(
      /version/i
    );
  });

  it("rejects a title or version that would not fit the UI", () => {
    expect(
      validateAgreementTemplate({ ...valid, title: "x".repeat(121) })
    ).toMatch(/120/);
    expect(
      validateAgreementTemplate({ ...valid, version: "x".repeat(21) })
    ).toMatch(/20/);
  });
});

describe("tallyAgreement confirmedCount", () => {
  const signed = [
    { documentVersion: "1.0", signedAt: new Date("2026-01-01") },
    { documentVersion: "1.0", signedAt: new Date("2026-07-01") },
    null,
  ];

  it("counts everyone who is square with the agreement", () => {
    expect(tallyAgreement(template, signed).confirmedCount).toBe(2);
  });

  it("drops the people who owe a fresh confirmation", () => {
    // The case that read as "4/4 signed current" beside "3 to confirm":
    // everyone is on the current version, but only one replied since the ask.
    const tally = tallyAgreement(
      { ...template, requiresReAck: true, reAckSetAt: new Date("2026-06-01") },
      signed
    );
    expect(tally.signedCurrentCount).toBe(2);
    expect(tally.confirmedCount).toBe(1);
    expect(tally.confirmedCount + tally.pendingReAckCount).toBe(
      tally.totalVolunteers
    );
  });
});
