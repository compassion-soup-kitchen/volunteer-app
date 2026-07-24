import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { VERIFICATION_IDENTIFIER_PREFIX } from "./email-verification";
import {
  PASSWORD_RESET_IDENTIFIER_PREFIX,
  PASSWORD_RESET_TOKEN_TTL_MS,
  hashPasswordResetToken,
  passwordResetIdentifier,
} from "./password-reset";

const EMAIL = "mereana@soupkitchen.org.nz";

describe("passwordResetIdentifier", () => {
  it("namespaces the address under the reset prefix", () => {
    expect(passwordResetIdentifier(EMAIL)).toBe(`password-reset:${EMAIL}`);
  });

  // resetPassword recovers the address by slicing the prefix back off, so the
  // two halves have to agree exactly or a valid link resolves to no account.
  it("round-trips back to the address the way resetPassword slices it", () => {
    const identifier = passwordResetIdentifier(EMAIL);

    expect(identifier.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)).toBe(true);
    expect(identifier.slice(PASSWORD_RESET_IDENTIFIER_PREFIX.length)).toBe(EMAIL);
  });

  it("survives an address containing the prefix's own separator", () => {
    const odd = "weird:address@example.org";
    expect(
      passwordResetIdentifier(odd).slice(PASSWORD_RESET_IDENTIFIER_PREFIX.length)
    ).toBe(odd);
  });

  it("keeps one identifier per address", () => {
    expect(passwordResetIdentifier(EMAIL)).toBe(passwordResetIdentifier(EMAIL));
    expect(passwordResetIdentifier(EMAIL)).not.toBe(
      passwordResetIdentifier("someone.else@example.org")
    );
  });
});

describe("identifier namespacing", () => {
  // Both token kinds share the VerificationToken table. If either prefix were
  // a prefix of the other, a reset token could be redeemed as a verification
  // token (or the reverse), since both redeem paths gate on startsWith.
  it("cannot be confused with the email-verification namespace", () => {
    expect(PASSWORD_RESET_IDENTIFIER_PREFIX).not.toBe(
      VERIFICATION_IDENTIFIER_PREFIX
    );
    expect(
      PASSWORD_RESET_IDENTIFIER_PREFIX.startsWith(VERIFICATION_IDENTIFIER_PREFIX)
    ).toBe(false);
    expect(
      VERIFICATION_IDENTIFIER_PREFIX.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)
    ).toBe(false);
  });

  it("does not treat a verification identifier as a reset one", () => {
    const verification = `${VERIFICATION_IDENTIFIER_PREFIX}${EMAIL}`;
    expect(verification.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)).toBe(false);
  });
});

describe("hashPasswordResetToken", () => {
  it("is sha256 hex", () => {
    expect(hashPasswordResetToken("token-abc")).toBe(
      createHash("sha256").update("token-abc").digest("hex")
    );
  });

  it("is deterministic, so a link issued once still looks up later", () => {
    expect(hashPasswordResetToken("token-abc")).toBe(
      hashPasswordResetToken("token-abc")
    );
  });

  it("separates distinct tokens", () => {
    expect(hashPasswordResetToken("token-abc")).not.toBe(
      hashPasswordResetToken("token-abd")
    );
  });

  it("never returns the raw token, so nothing redeemable is stored", () => {
    const raw = "a".repeat(64);
    const hashed = hashPasswordResetToken(raw);

    expect(hashed).not.toBe(raw);
    expect(hashed).toHaveLength(64);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("PASSWORD_RESET_TOKEN_TTL_MS", () => {
  it("is the 60 minutes the reset email promises", () => {
    expect(PASSWORD_RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });
});
