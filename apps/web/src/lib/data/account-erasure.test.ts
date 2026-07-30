import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the one place that actually erases somebody, now shared by the
 * admin path (`staff-actions.deleteUser`) and the self-service path
 * (`account-actions.deleteOwnAccount` and `DELETE /api/v1/me/account`). A
 * regression here has twice the blast radius of the single-caller version it
 * replaced, so the branches that are hard to reach by hand - the last-admin
 * re-check inside the transaction, and Prisma's error codes - are pinned down
 * here rather than left to the pure guardrails in `user-deletion.test.ts`.
 */

const userFindUnique = vi.fn();
const userCount = vi.fn();
const userDelete = vi.fn();
const documentFindMany = vi.fn();
const documentCount = vi.fn();
const accountFindMany = vi.fn();
const shiftSignupCount = vi.fn();
const trainingAttendanceCount = vi.fn();
const signedAgreementCount = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    user: { findUnique: userFindUnique, count: userCount, delete: userDelete },
    document: { findMany: documentFindMany, count: documentCount },
    account: { findMany: accountFindMany },
    shiftSignup: { count: shiftSignupCount },
    trainingAttendance: { count: trainingAttendanceCount },
    signedAgreement: { count: signedAgreementCount },
    $transaction: transaction,
  }),
}));

const deleteFile = vi.fn();
vi.mock("@/lib/storage", () => ({ deleteFile: (key: string) => deleteFile(key) }));

const revokeAppleToken = vi.fn();
vi.mock("@/lib/apple-api", () => ({
  revokeAppleToken: (token: string) => revokeAppleToken(token),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// `after` defers work until the response is sent. Run it inline so the
// storage and revocation calls are observable.
vi.mock("next/server", () => ({
  after: (fn: () => Promise<void>) => fn(),
}));

import { Prisma } from "@prisma/client";
import { eraseUserAccount, loadAccountErasureFacts } from "./account-erasure";

const facts = {
  userId: "u1",
  name: "Aroha",
  email: "aroha@example.org.nz",
  role: "VOLUNTEER" as const,
  isArchived: false,
  erases: {
    shiftSignups: 2,
    attendedShifts: 1,
    trainingAttendances: 0,
    documents: 1,
    signedAgreements: 0,
  },
  authored: { shifts: 0, trainingSessions: 0, announcements: 0 },
  isLastAdmin: false,
  profileId: "p1",
};

/** Runs the callback against a tx stub, the way `$transaction` does. */
function runTransaction() {
  transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
    fn({ user: { delete: userDelete, count: userCount } })
  );
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("boom", {
    code,
    clientVersion: "7.9.0",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  documentFindMany.mockResolvedValue([]);
  accountFindMany.mockResolvedValue([]);
  userDelete.mockResolvedValue({});
  runTransaction();
});

describe("loadAccountErasureFacts", () => {
  beforeEach(() => {
    shiftSignupCount.mockResolvedValue(0);
    trainingAttendanceCount.mockResolvedValue(0);
    documentCount.mockResolvedValue(0);
    signedAgreementCount.mockResolvedValue(0);
    userCount.mockResolvedValue(1);
  });

  it("returns null for an account that no longer exists", async () => {
    userFindUnique.mockResolvedValueOnce(null);
    expect(await loadAccountErasureFacts("gone")).toBeNull();
  });

  it("gathers the authored counts alongside what is erased", async () => {
    userFindUnique.mockResolvedValueOnce({
      id: "u1",
      name: "Aroha",
      email: "aroha@example.org.nz",
      role: "COORDINATOR",
      status: "ACTIVE",
      volunteerProfile: { id: "p1" },
      _count: { createdShifts: 14, createdTraining: 3, createdAnnouncements: 1 },
    });
    shiftSignupCount.mockResolvedValue(6);

    const loaded = await loadAccountErasureFacts("u1");

    expect(loaded?.authored).toEqual({
      shifts: 14,
      trainingSessions: 3,
      announcements: 1,
    });
    expect(loaded?.isArchived).toBe(false);
  });

  // The target must be excluded from the tally: an *archived* admin isn't in
  // the active count, so counting the whole table would read as "one admin
  // left" and wrongly block deleting them.
  it("excludes the target when counting the remaining admins", async () => {
    userFindUnique.mockResolvedValueOnce({
      id: "u1",
      name: null,
      email: "admin@example.org.nz",
      role: "ADMIN",
      status: "ACTIVE",
      volunteerProfile: null,
      _count: { createdShifts: 0, createdTraining: 0, createdAnnouncements: 0 },
    });
    userCount.mockResolvedValue(0);

    const loaded = await loadAccountErasureFacts("u1");

    expect(loaded?.isLastAdmin).toBe(true);
    expect(userCount).toHaveBeenCalledWith({
      where: { role: "ADMIN", status: "ACTIVE", id: { not: "u1" } },
    });
  });

  it("skips the profile-scoped counts entirely when there is no profile", async () => {
    userFindUnique.mockResolvedValueOnce({
      id: "u1",
      name: null,
      email: "new@example.org.nz",
      role: "PUBLIC",
      status: "ACTIVE",
      volunteerProfile: null,
      _count: { createdShifts: 0, createdTraining: 0, createdAnnouncements: 0 },
    });

    const loaded = await loadAccountErasureFacts("u1");

    expect(loaded?.erases.shiftSignups).toBe(0);
    expect(shiftSignupCount).not.toHaveBeenCalled();
    expect(documentCount).not.toHaveBeenCalled();
  });
});

describe("eraseUserAccount", () => {
  it("deletes the user and reports success", async () => {
    expect(await eraseUserAccount(facts, "u1")).toEqual({ success: true });
    expect(userDelete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("runs the delete at serializable isolation", async () => {
    await eraseUserAccount(facts, "u1");
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  // The caller's pre-check reads a count from before the delete, so two admins
  // deleting two *different* admins concurrently could each see one remaining
  // and both commit.
  it("rolls back a delete that would leave no admin at all", async () => {
    userCount.mockResolvedValue(0);

    const result = await eraseUserAccount({ ...facts, role: "ADMIN" }, "actor");

    expect(result).toEqual({
      error:
        "That would leave the kitchen with no admin at all. Make someone else an admin first.",
    });
  });

  it("lets an admin go when others remain", async () => {
    userCount.mockResolvedValue(2);
    expect(await eraseUserAccount({ ...facts, role: "ADMIN" }, "actor")).toEqual(
      { success: true }
    );
  });

  it("does not re-count admins when deleting anybody else", async () => {
    await eraseUserAccount(facts, "actor");
    expect(userCount).not.toHaveBeenCalled();
  });

  describe("maps Prisma's failures to something a person can act on", () => {
    it.each([
      ["P2025", "That account no longer exists."],
      [
        "P2003",
        "The kitchen's records still reference this account. Please get in touch with the team.",
      ],
      [
        "P2014",
        "The kitchen's records still reference this account. Please get in touch with the team.",
      ],
      ["P2034", "Another change happened at the same time. Please try again."],
    ])("%s", async (code, message) => {
      transaction.mockRejectedValueOnce(prismaError(code));
      expect(await eraseUserAccount(facts, "actor")).toEqual({ error: message });
    });

    it("falls back to a generic message for anything else", async () => {
      transaction.mockRejectedValueOnce(new Error("network gone"));
      expect(await eraseUserAccount(facts, "actor")).toEqual({
        error: "Something went wrong. Please try again.",
      });
    });
  });

  describe("cleaning up what the cascade can't", () => {
    // Deleting the User cascades the Document rows away, so the keys have to
    // be read *before* the delete or the files are orphaned in the bucket
    // with no row left to find them by.
    it("reads the document keys before deleting, then removes the files", async () => {
      documentFindMany.mockResolvedValueOnce([
        { fileUrl: "docs/a.pdf" },
        { fileUrl: "docs/b.pdf" },
      ]);

      await eraseUserAccount(facts, "u1");

      expect(documentFindMany.mock.invocationCallOrder[0]).toBeLessThan(
        userDelete.mock.invocationCallOrder[0]
      );
      expect(deleteFile).toHaveBeenCalledWith("docs/a.pdf");
      expect(deleteFile).toHaveBeenCalledWith("docs/b.pdf");
    });

    it("looks for no documents when there is no profile", async () => {
      await eraseUserAccount({ ...facts, profileId: null }, "u1");
      expect(documentFindMany).not.toHaveBeenCalled();
    });

    // Required by App Store guideline 5.1.1(v), and the only thing that lets
    // this person sign up with Apple again later.
    it("revokes the Apple authorisation", async () => {
      accountFindMany.mockResolvedValueOnce([{ refresh_token: "refresh-1" }]);
      revokeAppleToken.mockResolvedValue({ ok: true });

      await eraseUserAccount(facts, "u1");

      expect(accountFindMany.mock.invocationCallOrder[0]).toBeLessThan(
        userDelete.mock.invocationCallOrder[0]
      );
      expect(revokeAppleToken).toHaveBeenCalledWith("refresh-1");
    });

    it("ignores Apple accounts with no token to revoke", async () => {
      accountFindMany.mockResolvedValueOnce([{ refresh_token: null }]);
      await eraseUserAccount(facts, "u1");
      expect(revokeAppleToken).not.toHaveBeenCalled();
    });

    // The person's data is already gone; an unreachable Apple or a storage
    // hiccup must not turn a completed deletion into a failure.
    it("still succeeds when revocation fails", async () => {
      accountFindMany.mockResolvedValueOnce([{ refresh_token: "refresh-1" }]);
      revokeAppleToken.mockResolvedValue({ ok: false, reason: "failed" });

      expect(await eraseUserAccount(facts, "u1")).toEqual({ success: true });
    });

    it("still succeeds when a file can't be deleted", async () => {
      documentFindMany.mockResolvedValueOnce([{ fileUrl: "docs/a.pdf" }]);
      deleteFile.mockRejectedValueOnce(new Error("bucket down"));

      expect(await eraseUserAccount(facts, "u1")).toEqual({ success: true });
    });

    it("does no cleanup at all when the delete failed", async () => {
      documentFindMany.mockResolvedValueOnce([{ fileUrl: "docs/a.pdf" }]);
      accountFindMany.mockResolvedValueOnce([{ refresh_token: "refresh-1" }]);
      transaction.mockRejectedValueOnce(prismaError("P2025"));

      await eraseUserAccount(facts, "actor");

      expect(deleteFile).not.toHaveBeenCalled();
      expect(revokeAppleToken).not.toHaveBeenCalled();
    });
  });

  // The account is gone, so this line is the only remaining trace. It must
  // record ids and counts, never the name or email we were asked to erase.
  it("audits the deletion without repeating what it erased", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await eraseUserAccount(facts, "admin-9");

    const [, payload] = warn.mock.calls.find(
      ([msg]) => msg === "[audit] user permanently deleted"
    )!;
    expect(payload).toMatchObject({
      actorId: "admin-9",
      targetId: "u1",
      targetRole: "VOLUNTEER",
      selfService: false,
    });
    expect(JSON.stringify(payload)).not.toContain("aroha@example.org.nz");
    expect(JSON.stringify(payload)).not.toContain("Aroha");
  });

  it("marks the audit line as self-service when you erase yourself", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await eraseUserAccount(facts, "u1");

    const [, payload] = warn.mock.calls.find(
      ([msg]) => msg === "[audit] user permanently deleted"
    )!;
    expect(payload).toMatchObject({ selfService: true });
  });
});
