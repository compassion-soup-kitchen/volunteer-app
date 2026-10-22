import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearRateLimits } from "./rate-limit";

const verifyCredentialsMock = vi.fn();

vi.mock("next-auth", () => {
  class FakeCredentialsSignin extends Error {
    code = "credentials";
  }
  return { CredentialsSignin: FakeCredentialsSignin };
});

vi.mock("@/lib/data/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/users")>();
  return {
    ...actual,
    verifyCredentials: (...args: unknown[]) => verifyCredentialsMock(...args),
  };
});

import { authorizeCredentials, SignInRateLimited } from "./credentials-authorize";

const user = {
  id: "u1",
  email: "busy@b.co",
  name: null,
  image: null,
  role: "VOLUNTEER" as const,
};

beforeEach(() => {
  verifyCredentialsMock.mockReset();
  verifyCredentialsMock.mockResolvedValue(null);
  clearRateLimits();
});

describe("authorizeCredentials", () => {
  it("returns the verified user", async () => {
    verifyCredentialsMock.mockResolvedValue(user);

    expect(
      await authorizeCredentials({ email: "busy@b.co", password: "pw" })
    ).toEqual(user);
    expect(verifyCredentialsMock).toHaveBeenCalledWith("busy@b.co", "pw");
  });

  it.each([
    ["no credentials", undefined],
    ["no email", { password: "pw" }],
    ["no password", { email: "busy@b.co" }],
    ["non-string fields", { email: ["busy@b.co"], password: 1 }],
  ])("refuses %s without checking anything", async (_, credentials) => {
    expect(await authorizeCredentials(credentials)).toBeNull();
    expect(verifyCredentialsMock).not.toHaveBeenCalled();
  });

  // NextAuth's own `POST /api/auth/callback/credentials` reaches this function
  // directly, skipping the sign-in form entirely. Before the budget lived
  // here, that endpoint allowed unlimited password guesses.
  it("refuses the 11th attempt in the window, before checking the password", async () => {
    for (let i = 0; i < 10; i++) {
      await authorizeCredentials({ email: "busy@b.co", password: "guess" });
    }

    const attempt = authorizeCredentials({ email: "busy@b.co", password: "guess" });

    await expect(attempt).rejects.toBeInstanceOf(SignInRateLimited);
    await expect(attempt).rejects.toMatchObject({ code: "rate_limited" });
    expect(verifyCredentialsMock).toHaveBeenCalledTimes(10);
  });

  it("shares one budget across case variants of the address", async () => {
    for (let i = 0; i < 10; i++) {
      await authorizeCredentials({ email: "Busy@B.co", password: "guess" });
    }

    await expect(
      authorizeCredentials({ email: " busy@b.co ", password: "guess" })
    ).rejects.toBeInstanceOf(SignInRateLimited);
  });

  it("says how long to wait", async () => {
    for (let i = 0; i < 10; i++) {
      await authorizeCredentials({ email: "busy@b.co", password: "guess" });
    }

    const error = await authorizeCredentials({
      email: "busy@b.co",
      password: "guess",
    }).catch((e: unknown) => e);

    expect((error as SignInRateLimited).retryAfterSeconds).toBeGreaterThan(0);
  });

  it("leaves other addresses their own budget", async () => {
    for (let i = 0; i < 10; i++) {
      await authorizeCredentials({ email: "busy@b.co", password: "guess" });
    }

    await expect(
      authorizeCredentials({ email: "other@b.co", password: "pw" })
    ).resolves.toBeNull();
  });
});
