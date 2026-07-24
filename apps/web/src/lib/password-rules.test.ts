import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";

import {
  PASSWORD_INPUT_MAX,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN,
  existingPasswordField,
  newPasswordField,
  passwordByteLength,
} from "./password-rules";

const TOO_SHORT = "Password must be at least 8 characters";
const REQUIRED = "Password is required";

const setting = newPasswordField(TOO_SHORT);
const verifying = existingPasswordField(REQUIRED);

/** First error message, or undefined when the value is accepted. */
function reject(schema: ZodType<string>, value: string): string | undefined {
  const parsed = schema.safeParse(value);
  return parsed.success ? undefined : parsed.error.issues[0].message;
}

describe("passwordByteLength", () => {
  it("counts UTF-8 bytes, not UTF-16 code units", () => {
    expect(passwordByteLength("abc")).toBe(3);
    expect("ā".length).toBe(1);
    expect(passwordByteLength("ā")).toBe(2);
    expect(passwordByteLength("🥣")).toBe(4);
  });
});

describe("newPasswordField", () => {
  it("accepts an ordinary password", () => {
    expect(reject(setting, "a-decent-passphrase")).toBeUndefined();
  });

  it("enforces the minimum with the caller's wording", () => {
    expect(reject(setting, "a".repeat(PASSWORD_MIN - 1))).toBe(TOO_SHORT);
  });

  it("accepts exactly the byte limit", () => {
    expect(reject(setting, "a".repeat(PASSWORD_MAX_BYTES))).toBeUndefined();
  });

  it("rejects one byte past the limit", () => {
    expect(reject(setting, "a".repeat(PASSWORD_MAX_BYTES + 1))).toMatch(
      /too long/i
    );
  });

  // The regression this module exists to prevent: bcrypt truncates at 72
  // bytes, so a character-count check would accept this and silently hash
  // only the first half of it.
  it("rejects a macron password that is short in characters but long in bytes", () => {
    const macrons = "ā".repeat(PASSWORD_MAX_BYTES);

    expect(macrons.length).toBe(PASSWORD_MAX_BYTES);
    expect(passwordByteLength(macrons)).toBe(PASSWORD_MAX_BYTES * 2);
    expect(reject(setting, macrons)).toMatch(/too long/i);
  });

  it("rejects an emoji password over the byte limit", () => {
    const bowls = "🥣".repeat(19); // 19 chars, 76 bytes

    expect(bowls.length).toBeLessThan(PASSWORD_MAX_BYTES);
    expect(passwordByteLength(bowls)).toBeGreaterThan(PASSWORD_MAX_BYTES);
    expect(reject(setting, bowls)).toMatch(/too long/i);
  });

  it("accepts non-ASCII that genuinely fits", () => {
    const macrons = "ā".repeat(PASSWORD_MAX_BYTES / 2);

    expect(passwordByteLength(macrons)).toBe(PASSWORD_MAX_BYTES);
    expect(reject(setting, macrons)).toBeUndefined();
  });
});

describe("existingPasswordField", () => {
  it("requires a value with the caller's wording", () => {
    expect(reject(verifying, "")).toBe(REQUIRED);
  });

  // Accounts predating the byte cap hold longer passwords. Rejecting them
  // here would mean their owners could never sign in to fix it.
  it("accepts a password longer than bcrypt's byte limit", () => {
    expect(
      reject(verifying, "a".repeat(PASSWORD_MAX_BYTES + 40))
    ).toBeUndefined();
  });

  it("still refuses an absurd input before it reaches bcrypt", () => {
    expect(reject(verifying, "a".repeat(PASSWORD_INPUT_MAX + 1))).toMatch(
      /doesn't look like a password/i
    );
  });

  it("accepts a value sitting exactly on the input ceiling", () => {
    expect(reject(verifying, "a".repeat(PASSWORD_INPUT_MAX))).toBeUndefined();
  });
});

describe("the two field kinds differ where it matters", () => {
  it("only the set-password rule applies the bcrypt byte cap", () => {
    const overByteCap = "a".repeat(PASSWORD_MAX_BYTES + 1);

    expect(reject(setting, overByteCap)).toMatch(/too long/i);
    expect(reject(verifying, overByteCap)).toBeUndefined();
  });

  it("both refuse unbounded input", () => {
    const huge = "a".repeat(PASSWORD_INPUT_MAX + 1);

    expect(reject(setting, huge)).toBeTruthy();
    expect(reject(verifying, huge)).toBeTruthy();
  });
});
