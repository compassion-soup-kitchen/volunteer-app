import { describe, expect, it } from "vitest";
import {
  isAssignableRole,
  isLastActiveAdmin,
  validateRoleChange,
  type RoleChangeInput,
} from "./role-change";

const base: RoleChangeInput = {
  actorUserId: "admin-1",
  targetUserId: "user-2",
  targetCurrentRole: "VOLUNTEER",
  newRole: "COORDINATOR",
  targetIsArchived: false,
  isTargetLastAdmin: false,
  targetHasProfile: true,
};

describe("isAssignableRole", () => {
  it("accepts the three assignable roles", () => {
    expect(isAssignableRole("VOLUNTEER")).toBe(true);
    expect(isAssignableRole("COORDINATOR")).toBe(true);
    expect(isAssignableRole("ADMIN")).toBe(true);
  });

  it("rejects PUBLIC and unknown values", () => {
    expect(isAssignableRole("PUBLIC")).toBe(false);
    expect(isAssignableRole("SUPERUSER")).toBe(false);
    expect(isAssignableRole("")).toBe(false);
  });
});

describe("validateRoleChange", () => {
  it("allows a normal promotion", () => {
    expect(validateRoleChange(base)).toBeNull();
  });

  it("allows demoting an admin when others remain", () => {
    expect(
      validateRoleChange({
        ...base,
        targetCurrentRole: "ADMIN",
        newRole: "VOLUNTEER",
        isTargetLastAdmin: false,
      })
    ).toBeNull();
  });

  it("rejects an unassignable target role", () => {
    expect(validateRoleChange({ ...base, newRole: "PUBLIC" })).toMatch(
      /can't be assigned/i
    );
  });

  it("blocks assigning a role to a still-PUBLIC pending applicant", () => {
    // A profile whose user is still PUBLIC hasn't been approved — promoting
    // them (even to VOLUNTEER, let alone ADMIN) must be blocked here.
    expect(
      validateRoleChange({
        ...base,
        targetCurrentRole: "PUBLIC",
        newRole: "ADMIN",
      })
    ).toMatch(/approve their application/i);
    expect(
      validateRoleChange({
        ...base,
        targetCurrentRole: "PUBLIC",
        newRole: "VOLUNTEER",
      })
    ).toMatch(/approve their application/i);
  });

  it("allows promoting a never-applied PUBLIC user (no profile) directly", () => {
    // Someone who signed in but never applied has no profile — staff can turn
    // them into a volunteer or elevate them straight to admin.
    expect(
      validateRoleChange({
        ...base,
        targetCurrentRole: "PUBLIC",
        targetHasProfile: false,
        newRole: "VOLUNTEER",
      })
    ).toBeNull();
    expect(
      validateRoleChange({
        ...base,
        targetCurrentRole: "PUBLIC",
        targetHasProfile: false,
        newRole: "ADMIN",
      })
    ).toBeNull();
  });

  it("blocks changing an archived account's role", () => {
    expect(
      validateRoleChange({ ...base, targetIsArchived: true })
    ).toMatch(/restore this account/i);
  });

  it("rejects changing your own role", () => {
    expect(
      validateRoleChange({ ...base, targetUserId: base.actorUserId })
    ).toMatch(/your own role/i);
  });

  it("rejects a no-op change to the same role", () => {
    expect(
      validateRoleChange({ ...base, newRole: base.targetCurrentRole })
    ).toMatch(/already have/i);
  });

  it("blocks demoting the last remaining admin", () => {
    expect(
      validateRoleChange({
        ...base,
        targetCurrentRole: "ADMIN",
        newRole: "COORDINATOR",
        isTargetLastAdmin: true,
      })
    ).toMatch(/last admin/i);
  });

  it("still allows re-affirming ADMIN on the last admin (no-op guard wins first)", () => {
    // newRole === current ADMIN is caught by the same-role rule, not the
    // last-admin rule — either way it must not throw or wrongly pass.
    expect(
      validateRoleChange({
        ...base,
        targetCurrentRole: "ADMIN",
        newRole: "ADMIN",
        isTargetLastAdmin: true,
      })
    ).toMatch(/already have/i);
  });
});

describe("isLastActiveAdmin", () => {
  it("is true only when the target is an admin and one active admin remains", () => {
    expect(isLastActiveAdmin("ADMIN", 1)).toBe(true);
    // Boundary: a second active admin means this one isn't the last.
    expect(isLastActiveAdmin("ADMIN", 2)).toBe(false);
  });

  it("treats a zero count as still-last (defensive against races)", () => {
    expect(isLastActiveAdmin("ADMIN", 0)).toBe(true);
  });

  it("is false for a non-admin target regardless of count", () => {
    expect(isLastActiveAdmin("VOLUNTEER", 1)).toBe(false);
    expect(isLastActiveAdmin("COORDINATOR", 0)).toBe(false);
  });
});
