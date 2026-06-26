import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInMock = vi.fn();
const findUniqueMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

vi.mock("next-auth", () => {
  class FakeAuthError extends Error {}
  return { AuthError: FakeAuthError };
});

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    user: {
      findUnique: findUniqueMock,
      create: createMock,
    },
  }),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
    compare: vi.fn(),
  },
}));

import { register, login } from "./auth-actions";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

beforeEach(() => {
  signInMock.mockReset();
  findUniqueMock.mockReset();
  createMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("register", () => {
  it("rejects a name that is too short", async () => {
    const result = await register(
      null,
      form({
        name: "A",
        email: "a@b.co",
        password: "longenough",
        confirmPassword: "longenough",
      }),
    );
    expect(result?.error).toMatch(/name/i);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "not-an-email",
        password: "longenough",
        confirmPassword: "longenough",
      }),
    );
    expect(result?.error).toMatch(/email/i);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "a@b.co",
        password: "short",
        confirmPassword: "short",
      }),
    );
    expect(result?.error).toMatch(/8 characters/);
  });

  it("rejects mismatched passwords", async () => {
    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "a@b.co",
        password: "longenough",
        confirmPassword: "different1",
      }),
    );
    expect(result).toEqual({ error: "Passwords do not match" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects when email already exists", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: "u1", email: "a@b.co" });
    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "a@b.co",
        password: "longenough",
        confirmPassword: "longenough",
      }),
    );
    expect(result).toEqual({
      error: "An account with this email already exists",
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a new user and signs them in on the happy path", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    createMock.mockResolvedValueOnce({ id: "u1" });
    signInMock.mockResolvedValueOnce(undefined);

    const result = await register(
      null,
      form({
        name: "Aroha",
        email: "a@b.co",
        password: "longenough",
        confirmPassword: "longenough",
      }),
    );

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "Aroha",
        email: "a@b.co",
        password: "hashed:longenough",
        role: "PUBLIC",
      },
    });
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "a@b.co",
      password: "longenough",
      redirectTo: "/dashboard",
    });
    expect(result).toBeNull();
  });
});

describe("login", () => {
  it("rejects an invalid email", async () => {
    const result = await login(
      null,
      form({ email: "nope", password: "anything" }),
    );
    expect(result?.error).toMatch(/email/i);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("rejects an empty password", async () => {
    const result = await login(
      null,
      form({ email: "a@b.co", password: "" }),
    );
    expect(result?.error).toMatch(/password/i);
  });

  it("delegates valid credentials to signIn", async () => {
    signInMock.mockResolvedValueOnce(undefined);
    const result = await login(
      null,
      form({ email: "a@b.co", password: "anything" }),
    );
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "a@b.co",
      password: "anything",
      redirectTo: "/dashboard",
    });
    expect(result).toBeNull();
  });
});
