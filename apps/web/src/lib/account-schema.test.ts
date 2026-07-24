import { describe, expect, it } from "vitest";
import {
  ACCOUNT_NAME_MAX,
  PASSWORD_MAX,
  parseAccountDetails,
  parsePasswordChange,
} from "./account-schema";

describe("parseAccountDetails", () => {
  it("trims the name", () => {
    const result = parseAccountDetails({ name: "  Aroha Ngata  " });
    expect(result.data?.name).toBe("Aroha Ngata");
  });

  it("rejects a name that is too short", () => {
    expect(parseAccountDetails({ name: "A" }).error).toMatch(/2 characters/);
  });

  it("rejects whitespace-only names", () => {
    expect(parseAccountDetails({ name: "   " }).error).toBeTruthy();
  });

  it("rejects a name past the length cap", () => {
    const result = parseAccountDetails({ name: "a".repeat(ACCOUNT_NAME_MAX + 1) });
    expect(result.error).toMatch(new RegExp(`${ACCOUNT_NAME_MAX}`));
  });

  it("rejects a missing name", () => {
    expect(parseAccountDetails({}).error).toBeTruthy();
  });
});

describe("parsePasswordChange", () => {
  const valid = {
    currentPassword: "old-password",
    newPassword: "brand-new-password",
    confirmPassword: "brand-new-password",
  };

  it("accepts a well-formed change", () => {
    expect(parsePasswordChange(valid).data).toEqual(valid);
  });

  it("requires the current password", () => {
    expect(
      parsePasswordChange({ ...valid, currentPassword: "" }).error
    ).toMatch(/current password/i);
  });

  it("requires the new password to be long enough", () => {
    expect(
      parsePasswordChange({
        ...valid,
        newPassword: "short1",
        confirmPassword: "short1",
      }).error
    ).toMatch(/8 characters/);
  });

  it("rejects a new password past bcrypt's 72-byte limit", () => {
    const long = "a".repeat(PASSWORD_MAX + 1);
    expect(
      parsePasswordChange({ ...valid, newPassword: long, confirmPassword: long })
        .error
    ).toMatch(new RegExp(`${PASSWORD_MAX}`));
  });

  it("rejects a mismatched confirmation", () => {
    expect(
      parsePasswordChange({ ...valid, confirmPassword: "something-else" }).error
    ).toMatch(/don't match/i);
  });

  it("rejects reusing the current password", () => {
    expect(
      parsePasswordChange({
        currentPassword: "same-password",
        newPassword: "same-password",
        confirmPassword: "same-password",
      }).error
    ).toMatch(/different/i);
  });

  it("reports the field error before the mismatch error", () => {
    expect(
      parsePasswordChange({
        currentPassword: "",
        newPassword: "brand-new-password",
        confirmPassword: "nope",
      }).error
    ).toMatch(/current password/i);
  });
});
