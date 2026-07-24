import { describe, expect, it } from "vitest";
import { ACCOUNT_NAME_MAX, parseAccountDetails, parsePasswordChange } from "./account-schema";
import {
  PASSWORD_INPUT_MAX,
  PASSWORD_MAX_BYTES,
  passwordByteLength,
} from "./password-rules";

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
    const long = "a".repeat(PASSWORD_MAX_BYTES + 1);
    expect(
      parsePasswordChange({ ...valid, newPassword: long, confirmPassword: long })
        .error
    ).toMatch(new RegExp(`${PASSWORD_MAX_BYTES}`));
  });

  it("accepts a new password sitting exactly on the byte limit", () => {
    const exact = "a".repeat(PASSWORD_MAX_BYTES);
    expect(
      parsePasswordChange({ ...valid, newPassword: exact, confirmPassword: exact })
        .data
    ).toBeDefined();
  });

  // The bug this guards: 72 macron vowels are 72 characters but 144 bytes,
  // and bcrypt would silently hash only the first half.
  it("counts bytes, not characters, so macrons can't smuggle past the limit", () => {
    const macrons = "ā".repeat(PASSWORD_MAX_BYTES);
    expect(macrons.length).toBe(PASSWORD_MAX_BYTES);
    expect(passwordByteLength(macrons)).toBe(PASSWORD_MAX_BYTES * 2);
    expect(
      parsePasswordChange({
        ...valid,
        newPassword: macrons,
        confirmPassword: macrons,
      }).error
    ).toMatch(/too long/i);
  });

  it("accepts a macron password that fits once measured in bytes", () => {
    const macrons = "ā".repeat(PASSWORD_MAX_BYTES / 2);
    expect(passwordByteLength(macrons)).toBe(PASSWORD_MAX_BYTES);
    expect(
      parsePasswordChange({
        ...valid,
        newPassword: macrons,
        confirmPassword: macrons,
      }).data
    ).toBeDefined();
  });

  // bcrypt.compare's cost scales with input size before it truncates, so the
  // current password is bounded too - just far above the bcrypt limit, since
  // older accounts may legitimately hold a password longer than 72 bytes.
  it("bounds the current password well above bcrypt's limit", () => {
    const legacy = "a".repeat(PASSWORD_MAX_BYTES + 30);
    expect(
      parsePasswordChange({ ...valid, currentPassword: legacy }).data
    ).toBeDefined();

    expect(
      parsePasswordChange({
        ...valid,
        currentPassword: "a".repeat(PASSWORD_INPUT_MAX + 1),
      }).error
    ).toMatch(/doesn't look like a password/i);
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
