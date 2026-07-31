import { beforeAll, describe, expect, it } from "vitest";
import { exportPKCS8, generateKeyPair, importPKCS8 } from "jose";
import { readAppleServerCredentials } from "./apple-api";

/**
 * The `.p8` Apple issues is a multi-line PEM, and it has to survive a trip
 * through a secret store that may or may not keep newlines. Generated here
 * rather than committed as a fixture - it is a private key either way, and a
 * real one in the repo would be a liability even if it signs nothing.
 */
let pem: string;

beforeAll(async () => {
  const { privateKey } = await generateKeyPair("ES256", { extractable: true });
  pem = await exportPKCS8(privateKey);
});

const BUNDLE_ID = "nz.org.compassion.volunteer";

function env(privateKey: string) {
  return {
    APPLE_CLIENT_ID: BUNDLE_ID,
    APPLE_TEAM_ID: "TEAM123456",
    APPLE_KEY_ID: "KEY1234567",
    APPLE_PRIVATE_KEY: privateKey,
  };
}

describe("readAppleServerCredentials", () => {
  it("returns null when nothing is configured", () => {
    expect(readAppleServerCredentials({})).toBeNull();
  });

  // Sign-in only needs APPLE_CLIENT_ID; these three are for revocation, so a
  // half-filled set has to read as "not configured" rather than crash later.
  it("returns null when any single credential is missing", () => {
    for (const key of [
      "APPLE_TEAM_ID",
      "APPLE_KEY_ID",
      "APPLE_PRIVATE_KEY",
      "APPLE_CLIENT_ID",
    ] as const) {
      const partial = { ...env("key") };
      delete partial[key];
      expect(readAppleServerCredentials(partial), key).toBeNull();
    }
  });

  it("takes the first client id when several are configured", () => {
    const creds = readAppleServerCredentials({
      ...env("key"),
      APPLE_CLIENT_ID: `${BUNDLE_ID},nz.org.compassion.web`,
    });
    expect(creds?.clientId).toBe(BUNDLE_ID);
  });

  it("trims whitespace around the ids", () => {
    const creds = readAppleServerCredentials({
      ...env("key"),
      APPLE_TEAM_ID: "  TEAM123456  ",
      APPLE_KEY_ID: "\tKEY1234567\n",
    });
    expect(creds?.teamId).toBe("TEAM123456");
    expect(creds?.keyId).toBe("KEY1234567");
  });
});

// The point of the normalisation: whichever shape the secret store hands back,
// the result has to be a PEM `importPKCS8` accepts - otherwise revocation
// fails at the worst possible moment, when the account has already gone.
describe("the private key survives its trip through the environment", () => {
  it("accepts the .p8 pasted with its real newlines", async () => {
    const creds = readAppleServerCredentials(env(pem));
    await expect(importPKCS8(creds!.privateKey, "ES256")).resolves.toBeDefined();
  });

  it("accepts a single line with escaped newlines", async () => {
    const flattened = pem.replace(/\n/g, "\\n");
    expect(flattened).not.toContain("\n");

    const creds = readAppleServerCredentials(env(flattened));
    await expect(importPKCS8(creds!.privateKey, "ES256")).resolves.toBeDefined();
  });

  it("accepts escaped newlines with whitespace around them", async () => {
    const padded = `  ${pem.replace(/\n/g, "\\n")}  `;
    const creds = readAppleServerCredentials(env(padded));
    await expect(importPKCS8(creds!.privateKey, "ES256")).resolves.toBeDefined();
  });
});
