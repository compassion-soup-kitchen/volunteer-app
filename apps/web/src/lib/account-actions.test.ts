import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearRateLimits } from "./rate-limit";

const authMock = vi.fn();
const findUniqueMock = vi.fn();
const updateMock = vi.fn();
const tokenDeleteManyMock = vi.fn();
const sendEmailMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    user: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
    verificationToken: {
      deleteMany: tokenDeleteManyMock,
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  };
});

import bcrypt from "bcryptjs";
import {
  changeMyPassword,
  getMyAccount,
  updateAccountDetails,
} from "./account-actions";

const USER_ID = "user_1";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

function signedIn(id = USER_ID) {
  authMock.mockResolvedValue({ user: { id, role: "ADMIN" } });
}

function passwordForm(overrides: Partial<Record<string, string>> = {}) {
  return form({
    currentPassword: "current-password",
    newPassword: "brand-new-password",
    confirmPassword: "brand-new-password",
    ...overrides,
  });
}

/** An active credentials account. */
function credentialsUser() {
  return {
    id: USER_ID,
    name: "Mereana Whitiora",
    email: "mereana@soupkitchen.org.nz",
    password: "hashed:current-password",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearRateLimits();
  authMock.mockResolvedValue(null);
  vi.mocked(bcrypt.compare).mockReset();
});

describe("getMyAccount", () => {
  it("returns null when signed out", async () => {
    expect(await getMyAccount()).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("looks the account up by the session's own id", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue({
      ...credentialsUser(),
      image: null,
      role: "ADMIN",
      emailVerified: new Date(),
      createdAt: new Date(),
    });

    await getMyAccount();

    expect(findUniqueMock.mock.calls[0][0].where).toEqual({ id: USER_ID });
  });

  it("reports hasPassword and never returns the hash", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue({
      ...credentialsUser(),
      image: null,
      role: "ADMIN",
      emailVerified: new Date(),
      createdAt: new Date(),
    });

    const account = await getMyAccount();

    expect(account?.hasPassword).toBe(true);
    expect(account).not.toHaveProperty("password");
  });

  it("reports hasPassword false for a Google-only account", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue({
      ...credentialsUser(),
      password: null,
      image: null,
      role: "COORDINATOR",
      emailVerified: new Date(),
      createdAt: new Date(),
    });

    expect((await getMyAccount())?.hasPassword).toBe(false);
  });

  it("returns null when the session points at a deleted user", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue(null);

    expect(await getMyAccount()).toBeNull();
  });
});

describe("updateAccountDetails", () => {
  it("refuses when signed out", async () => {
    const result = await updateAccountDetails(null, form({ name: "Someone" }));

    expect(result?.error).toMatch(/signed in/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid name without touching the database", async () => {
    signedIn();

    const result = await updateAccountDetails(null, form({ name: "A" }));

    expect(result?.error).toMatch(/2 characters/);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("saves the trimmed name scoped to the session's own id", async () => {
    signedIn();
    updateMock.mockResolvedValue({});

    const result = await updateAccountDetails(
      null,
      form({ name: "  Mereana Whitiora  " })
    );

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { name: "Mereana Whitiora" },
    });
    expect(result?.savedName).toBe("Mereana Whitiora");
  });

  it("revalidates the staff shell but not the whole app", async () => {
    signedIn();
    updateMock.mockResolvedValue({});

    await updateAccountDetails(null, form({ name: "Mereana Whitiora" }));

    expect(revalidatePathMock).toHaveBeenCalledWith("/staff", "layout");
    expect(revalidatePathMock).not.toHaveBeenCalledWith("/", "layout");
  });
});

describe("changeMyPassword", () => {
  it("refuses when signed out", async () => {
    const result = await changeMyPassword(null, passwordForm());

    expect(result?.error).toMatch(/signed in/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a mismatched confirmation before reaching the database", async () => {
    signedIn();

    const result = await changeMyPassword(
      null,
      passwordForm({ confirmPassword: "something-else" })
    );

    expect(result?.error).toMatch(/don't match/i);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("refuses a Google-only account and points at the reset flow", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue({ ...credentialsUser(), password: null });

    const result = await changeMyPassword(null, passwordForm());

    expect(result?.error).toMatch(/Google/);
    expect(result?.error).toMatch(/Forgot password/);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a wrong current password without writing", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue(credentialsUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await changeMyPassword(null, passwordForm());

    expect(result?.error).toMatch(/current password isn't right/i);
    expect(updateMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("stores the new hash against the session's own id", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue(credentialsUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    updateMock.mockResolvedValue({});

    const result = await changeMyPassword(null, passwordForm());

    expect(result?.success).toBeTruthy();
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { password: "hashed:brand-new-password" },
    });
  });

  it("burns any outstanding reset token for the account", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue(credentialsUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    updateMock.mockResolvedValue({});

    await changeMyPassword(null, passwordForm());

    expect(tokenDeleteManyMock).toHaveBeenCalledWith({
      where: { identifier: "password-reset:mereana@soupkitchen.org.nz" },
    });
  });

  it("emails the account holder that the password changed", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue(credentialsUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    updateMock.mockResolvedValue({});

    await changeMyPassword(null, passwordForm());

    const sent = sendEmailMock.mock.calls[0][0];
    expect(sent.to).toBe("mereana@soupkitchen.org.nz");
    expect(sent.subject).toMatch(/password was changed/i);
  });

  it("still reports success when the notification email fails", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue(credentialsUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    updateMock.mockResolvedValue({});
    sendEmailMock.mockResolvedValue({ ok: false });

    const result = await changeMyPassword(null, passwordForm());

    expect(result?.success).toBeTruthy();
  });

  it("throttles repeated attempts and stops hitting bcrypt", async () => {
    signedIn();
    findUniqueMock.mockResolvedValue(credentialsUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    for (let i = 0; i < 5; i++) {
      const result = await changeMyPassword(null, passwordForm());
      expect(result?.error).toMatch(/current password isn't right/i);
    }

    const blocked = await changeMyPassword(null, passwordForm());

    expect(blocked?.error).toMatch(/too many attempts/i);
    expect(vi.mocked(bcrypt.compare)).toHaveBeenCalledTimes(5);
  });

  it("keeps each account's throttle budget separate", async () => {
    findUniqueMock.mockResolvedValue(credentialsUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    signedIn("user_1");
    for (let i = 0; i < 5; i++) await changeMyPassword(null, passwordForm());
    expect((await changeMyPassword(null, passwordForm()))?.error).toMatch(
      /too many attempts/i
    );

    signedIn("user_2");
    expect((await changeMyPassword(null, passwordForm()))?.error).toMatch(
      /current password isn't right/i
    );
  });
});
