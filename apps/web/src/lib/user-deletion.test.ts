import { describe, expect, it } from "vitest";
import {
  countAuthoredRecords,
  describeAuthoredRecords,
  findDeletionBlocker,
  matchesDeletionConfirmation,
  validateUserDeletion,
  wouldRemoveLastAdmin,
  type UserDeletionInput,
} from "./user-deletion";

const NO_AUTHORED = { shifts: 0, trainingSessions: 0, announcements: 0 };

function input(overrides: Partial<UserDeletionInput> = {}): UserDeletionInput {
  return {
    actorUserId: "admin-1",
    targetUserId: "user-2",
    targetRole: "VOLUNTEER",
    targetEmail: "aroha@example.org.nz",
    isLastAdmin: false,
    authored: NO_AUTHORED,
    confirmation: "aroha@example.org.nz",
    ...overrides,
  };
}

describe("countAuthoredRecords", () => {
  it("sums every authored kind", () => {
    expect(
      countAuthoredRecords({ shifts: 2, trainingSessions: 3, announcements: 4 })
    ).toBe(9);
  });

  it("is zero when nothing was authored", () => {
    expect(countAuthoredRecords(NO_AUTHORED)).toBe(0);
  });
});

describe("describeAuthoredRecords", () => {
  it("returns an empty string when nothing was authored", () => {
    expect(describeAuthoredRecords(NO_AUTHORED)).toBe("");
  });

  it("singularises a count of one", () => {
    expect(
      describeAuthoredRecords({ ...NO_AUTHORED, shifts: 1 })
    ).toBe("1 shift");
  });

  it("pluralises counts above one", () => {
    expect(describeAuthoredRecords({ ...NO_AUTHORED, shifts: 4 })).toBe(
      "4 shifts"
    );
  });

  it("joins two kinds with 'and'", () => {
    expect(
      describeAuthoredRecords({
        shifts: 2,
        trainingSessions: 1,
        announcements: 0,
      })
    ).toBe("2 shifts and 1 training session");
  });

  it("joins three kinds with commas and a final 'and'", () => {
    expect(
      describeAuthoredRecords({
        shifts: 12,
        trainingSessions: 2,
        announcements: 3,
      })
    ).toBe("12 shifts, 2 training sessions and 3 pānui");
  });

  it("leaves pānui uninflected", () => {
    expect(
      describeAuthoredRecords({ ...NO_AUTHORED, announcements: 1 })
    ).toBe("1 pānui");
  });

  it("omits kinds with a zero count", () => {
    expect(
      describeAuthoredRecords({
        shifts: 0,
        trainingSessions: 5,
        announcements: 0,
      })
    ).toBe("5 training sessions");
  });
});

describe("wouldRemoveLastAdmin", () => {
  it("is true for an admin with no other active admin left", () => {
    expect(wouldRemoveLastAdmin("ADMIN", 0)).toBe(true);
  });

  it("is false for an admin when another active admin remains", () => {
    expect(wouldRemoveLastAdmin("ADMIN", 1)).toBe(false);
  });

  it("is false for non-admins even with no admins left", () => {
    expect(wouldRemoveLastAdmin("COORDINATOR", 0)).toBe(false);
    expect(wouldRemoveLastAdmin("VOLUNTEER", 0)).toBe(false);
    expect(wouldRemoveLastAdmin("PUBLIC", 0)).toBe(false);
  });
});

describe("matchesDeletionConfirmation", () => {
  it("accepts an exact match", () => {
    expect(matchesDeletionConfirmation("a@b.nz", "a@b.nz")).toBe(true);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(matchesDeletionConfirmation("  A@B.NZ ", "a@b.nz")).toBe(true);
  });

  it("rejects a different address", () => {
    expect(matchesDeletionConfirmation("a@b.nz", "c@d.nz")).toBe(false);
  });

  it("rejects an empty entry", () => {
    expect(matchesDeletionConfirmation("", "a@b.nz")).toBe(false);
    expect(matchesDeletionConfirmation("   ", "a@b.nz")).toBe(false);
  });

  it("never matches when the target has no email on record", () => {
    expect(matchesDeletionConfirmation("", "")).toBe(false);
    expect(matchesDeletionConfirmation("  ", "   ")).toBe(false);
  });
});

describe("findDeletionBlocker", () => {
  it("returns null for an ordinary volunteer", () => {
    expect(findDeletionBlocker(input())).toBeNull();
  });

  it("blocks deleting yourself", () => {
    expect(
      findDeletionBlocker(input({ targetUserId: "admin-1" }))
    ).toBe("You can't delete your own account.");
  });

  it("blocks deleting the last admin", () => {
    expect(findDeletionBlocker(input({ isLastAdmin: true }))).toBe(
      "You can't delete the last admin. Promote someone else first."
    );
  });

  it("blocks anyone who authored org records, and says what they made", () => {
    expect(
      findDeletionBlocker(
        input({
          authored: { shifts: 3, trainingSessions: 0, announcements: 1 },
        })
      )
    ).toBe(
      "They created 3 shifts and 1 pānui, which the kitchen's records depend on. Archive their account instead."
    );
  });

  it("checks self before authored records so the clearer message wins", () => {
    expect(
      findDeletionBlocker(
        input({
          targetUserId: "admin-1",
          authored: { shifts: 3, trainingSessions: 0, announcements: 0 },
        })
      )
    ).toBe("You can't delete your own account.");
  });
});

describe("validateUserDeletion", () => {
  it("allows a fully confirmed deletion", () => {
    expect(validateUserDeletion(input())).toBeNull();
  });

  it("accepts a confirmation typed in a different case", () => {
    expect(
      validateUserDeletion(input({ confirmation: "AROHA@Example.org.nz" }))
    ).toBeNull();
  });

  it("rejects a mistyped confirmation", () => {
    expect(validateUserDeletion(input({ confirmation: "aroha@example" }))).toBe(
      "Type their email address exactly to confirm."
    );
  });

  it("rejects a missing confirmation", () => {
    expect(validateUserDeletion(input({ confirmation: "" }))).toBe(
      "Type their email address exactly to confirm."
    );
  });

  it("reports a blocker even when the confirmation is correct", () => {
    expect(validateUserDeletion(input({ isLastAdmin: true }))).toBe(
      "You can't delete the last admin. Promote someone else first."
    );
  });
});
