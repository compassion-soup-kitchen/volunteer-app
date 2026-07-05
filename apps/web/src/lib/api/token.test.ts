// @vitest-environment node
// (jose's WebCrypto build rejects jsdom's cross-realm Uint8Array)
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueApiToken, verifyApiToken } from "./token";

describe("api tokens", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret-for-unit-tests");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips the user id", async () => {
    const token = await issueApiToken("user-123");
    await expect(verifyApiToken(token)).resolves.toBe("user-123");
  });

  it("rejects a tampered token", async () => {
    const token = await issueApiToken("user-123");
    const [header, payload] = token.split(".");
    const forged = `${header}.${payload}.forged-signature`;
    await expect(verifyApiToken(forged)).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await issueApiToken("user-123");
    vi.stubEnv("NEXTAUTH_SECRET", "a-completely-different-secret");
    await expect(verifyApiToken(token)).resolves.toBeNull();
  });

  it("rejects garbage input", async () => {
    await expect(verifyApiToken("not-a-jwt")).resolves.toBeNull();
  });

  it("throws when NEXTAUTH_SECRET is missing", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");
    await expect(issueApiToken("user-123")).rejects.toThrow(
      "NEXTAUTH_SECRET is not set"
    );
  });
});
