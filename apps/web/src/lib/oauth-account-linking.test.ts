import { describe, expect, it } from "vitest";
import { decideEmailLink } from "./oauth-account-linking";

const verified = new Date("2026-01-01T00:00:00Z");

describe("decideEmailLink", () => {
  it("links onto an account whose address is verified", () => {
    expect(
      decideEmailLink({ emailVerified: verified, status: "ACTIVE", isOffline: false })
    ).toBe("link");
  });

  it("refuses an account whose address was never verified", () => {
    expect(
      decideEmailLink({ emailVerified: null, status: "ACTIVE", isOffline: false })
    ).toBe("unverified");
  });

  it("refuses an offline volunteer, whose address staff typed in", () => {
    expect(
      decideEmailLink({ emailVerified: verified, status: "ACTIVE", isOffline: true })
    ).toBe("unverified");
  });

  it("reports an archived account as archived, verified or not", () => {
    expect(
      decideEmailLink({ emailVerified: verified, status: "ARCHIVED", isOffline: false })
    ).toBe("archived");
    expect(
      decideEmailLink({ emailVerified: null, status: "ARCHIVED", isOffline: false })
    ).toBe("archived");
  });
});
