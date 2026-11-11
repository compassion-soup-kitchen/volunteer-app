import { beforeAll, describe, expect, it } from "vitest";
import {
  decodeJwt,
  decodeProtectedHeader,
  exportPKCS8,
  generateKeyPair,
  importPKCS8,
} from "jose";
import {
  appleCredentialsForAccount,
  getAppleWebClientSecret,
  readAppleServerCredentials,
  readAppleWebCredentials,
} from "./apple-api";

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

describe("readAppleWebCredentials", () => {
  const SERVICES_ID = "nz.org.compassion.volunteer.web";

  // The website signs in as its Services ID, and needs no bundle id at all.
  it("pairs the Services ID with the shared signing key", () => {
    const key: Partial<ReturnType<typeof env>> = env("key");
    delete key.APPLE_CLIENT_ID;
    const creds = readAppleWebCredentials({ ...key, APPLE_WEB_CLIENT_ID: ` ${SERVICES_ID} ` });
    expect(creds).toMatchObject({ clientId: SERVICES_ID, teamId: "TEAM123456" });
  });

  it("is off without a Services ID or without the key", () => {
    expect(readAppleWebCredentials(env("key"))).toBeNull();
    expect(
      readAppleWebCredentials({ APPLE_WEB_CLIENT_ID: SERVICES_ID, APPLE_TEAM_ID: "T" })
    ).toBeNull();
  });
});

describe("getAppleWebClientSecret", () => {
  const SERVICES_ID = "nz.org.compassion.volunteer.web";
  const webEnv = () => ({ ...env(pem), APPLE_WEB_CLIENT_ID: SERVICES_ID });

  it("is null when web sign-in isn't configured", async () => {
    await expect(getAppleWebClientSecret(env(pem))).resolves.toBeNull();
  });

  it("mints a secret Apple will accept for the Services ID", async () => {
    const secret = await getAppleWebClientSecret(webEnv(), Date.now() + 1);
    const claims = decodeJwt(secret!);
    expect(claims).toMatchObject({
      iss: "TEAM123456",
      sub: SERVICES_ID,
      aud: "https://appleid.apple.com",
    });
    expect(decodeProtectedHeader(secret!)).toMatchObject({ alg: "ES256", kid: "KEY1234567" });
  });

  // Minting per request would be wasteful; never reminting would let a
  // long-lived container outlive the secret and break every Apple sign-in.
  it("reuses the secret until shortly before it lapses", async () => {
    const start = Date.now() + 10_000;
    const first = await getAppleWebClientSecret(webEnv(), start);
    const later = await getAppleWebClientSecret(webEnv(), start + 60 * 60 * 1000);
    expect(later).toBe(first);

    const nearExpiry = start + 23.5 * 60 * 60 * 1000;
    const reminted = await getAppleWebClientSecret(webEnv(), nearExpiry);
    expect(reminted).not.toBe(first);
  });
});

describe("appleCredentialsForAccount", () => {
  const SERVICES_ID = "nz.org.compassion.volunteer.web";
  const both = () => ({ ...env("key"), APPLE_WEB_CLIENT_ID: SERVICES_ID });
  const idToken = (aud: string) =>
    `${btoa(JSON.stringify({ alg: "none" }))}.${btoa(JSON.stringify({ aud }))}.`;

  // Apple only revokes as the client the grant was issued to.
  it("revokes a web sign-in as the website", () => {
    expect(appleCredentialsForAccount(idToken(SERVICES_ID), both())?.clientId).toBe(
      SERVICES_ID
    );
  });

  it("revokes an app sign-in - which stores no ID token - as the app", () => {
    expect(appleCredentialsForAccount(null, both())?.clientId).toBe(BUNDLE_ID);
    expect(appleCredentialsForAccount(idToken(BUNDLE_ID), both())?.clientId).toBe(
      BUNDLE_ID
    );
  });

  it("falls back to the app for a token it can't read", () => {
    expect(appleCredentialsForAccount("not-a-jwt", both())?.clientId).toBe(BUNDLE_ID);
  });
});
