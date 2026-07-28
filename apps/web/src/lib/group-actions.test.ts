import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

// What Postgres raises when a save loses the race for a name.
const duplicateNameError = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.9.0",
    meta: { target: ["nameKey"] },
  });

const authMock = vi.fn();
const groupFindManyMock = vi.fn();
const groupFindUniqueMock = vi.fn();
const groupCreateMock = vi.fn();
const groupUpdateMock = vi.fn();
const groupDeleteMock = vi.fn();
const profileFindManyMock = vi.fn();
const profileFindUniqueMock = vi.fn();
const profileUpdateMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    volunteerGroup: {
      findMany: groupFindManyMock,
      findUnique: groupFindUniqueMock,
      create: groupCreateMock,
      update: groupUpdateMock,
      delete: groupDeleteMock,
    },
    volunteerProfile: {
      findMany: profileFindManyMock,
      findUnique: profileFindUniqueMock,
      update: profileUpdateMock,
    },
  }),
}));

import {
  createVolunteerGroup,
  deleteVolunteerGroup,
  getAssignableGroups,
  getGroupCandidates,
  getMyGroups,
  getVisibleTeam,
  getVolunteerGroups,
  setGroupMembers,
  setVolunteerGroups,
  toggleVolunteerGroupArchive,
  updateVolunteerGroup,
} from "./group-actions";

const coordinator = { user: { id: "staff-1", role: "COORDINATOR" } };
const admin = { user: { id: "admin-1", role: "ADMIN" } };
const volunteer = { user: { id: "vol-user-1", role: "VOLUNTEER" } };

const validForm = {
  name: "Team Leaders",
  description: "Runs the shift on the day",
  tone: "BRAND",
  visibleToVolunteers: true,
};

beforeEach(() => {
  authMock.mockReset();
  groupFindManyMock.mockReset().mockResolvedValue([]);
  groupFindUniqueMock.mockReset().mockResolvedValue(null);
  groupCreateMock.mockReset().mockResolvedValue({});
  groupUpdateMock.mockReset().mockResolvedValue({ isArchived: true });
  groupDeleteMock.mockReset().mockResolvedValue({});
  profileFindManyMock.mockReset().mockResolvedValue([]);
  profileFindUniqueMock.mockReset().mockResolvedValue(null);
  profileUpdateMock.mockReset().mockResolvedValue({});
  revalidatePathMock.mockReset();
});

describe("staff gate", () => {
  // Groups grant no access, but only staff may hand them out - and a volunteer
  // must never be able to file themselves under Team Leaders.
  const mutations: [string, () => Promise<{ error?: string }>][] = [
    ["createVolunteerGroup", () => createVolunteerGroup(validForm)],
    ["updateVolunteerGroup", () => updateVolunteerGroup("g1", validForm)],
    ["toggleVolunteerGroupArchive", () => toggleVolunteerGroupArchive("g1")],
    ["deleteVolunteerGroup", () => deleteVolunteerGroup("g1")],
    ["setGroupMembers", () => setGroupMembers("g1", ["p1"])],
    ["setVolunteerGroups", () => setVolunteerGroups("p1", ["g1"])],
  ];

  for (const [name, call] of mutations) {
    it(`${name} refuses a volunteer`, async () => {
      authMock.mockResolvedValue(volunteer);
      expect(await call()).toEqual({ error: "Not authorised." });
      expect(groupCreateMock).not.toHaveBeenCalled();
      expect(groupUpdateMock).not.toHaveBeenCalled();
      expect(groupDeleteMock).not.toHaveBeenCalled();
      expect(profileUpdateMock).not.toHaveBeenCalled();
    });

    it(`${name} refuses a signed-out caller`, async () => {
      authMock.mockResolvedValue(null);
      expect(await call()).toEqual({ error: "Not authorised." });
    });
  }

  const reads: [string, () => Promise<unknown[]>][] = [
    ["getVolunteerGroups", getVolunteerGroups],
    ["getAssignableGroups", getAssignableGroups],
    ["getGroupCandidates", getGroupCandidates],
  ];

  for (const [name, call] of reads) {
    it(`${name} returns nothing for a volunteer`, async () => {
      authMock.mockResolvedValue(volunteer);
      expect(await call()).toEqual([]);
      expect(groupFindManyMock).not.toHaveBeenCalled();
      expect(profileFindManyMock).not.toHaveBeenCalled();
    });
  }

  it("lets a coordinator create a group", async () => {
    authMock.mockResolvedValue(coordinator);
    expect(await createVolunteerGroup(validForm)).toEqual({ success: true });
    expect(groupCreateMock).toHaveBeenCalledWith({
      data: {
        name: "Team Leaders",
        nameKey: "team leaders",
        description: "Runs the shift on the day",
        tone: "BRAND",
        visibleToVolunteers: true,
      },
    });
  });
});

describe("createVolunteerGroup", () => {
  beforeEach(() => authMock.mockResolvedValue(admin));

  it("rejects a name that already exists, whatever the casing", async () => {
    groupFindManyMock.mockResolvedValue([{ id: "g1", name: "team leaders" }]);

    expect(await createVolunteerGroup(validForm)).toEqual({
      error: "A group with this name already exists.",
    });
    expect(groupCreateMock).not.toHaveBeenCalled();
  });

  it("reports a duplicate when the database rejects the write", async () => {
    // Nothing clashed at read time, so two saves raced and this one lost the
    // nameKey unique index - the person should see the same message either way.
    groupFindManyMock.mockResolvedValue([]);
    groupCreateMock.mockRejectedValue(duplicateNameError());

    expect(await createVolunteerGroup(validForm)).toEqual({
      error: "A group with this name already exists.",
    });
  });

  it("keeps the generic message for any other failure", async () => {
    groupCreateMock.mockRejectedValue(new Error("connection lost"));

    expect(await createVolunteerGroup(validForm)).toEqual({
      error: "Something went wrong. Please try again.",
    });
  });

  it("stores a lowercased key alongside the name", async () => {
    await createVolunteerGroup({ ...validForm, name: "  Guardian   ANGELS " });

    expect(groupCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Guardian ANGELS",
        nameKey: "guardian angels",
      }),
    });
  });

  it("passes validation failures straight back", async () => {
    expect(await createVolunteerGroup({ ...validForm, name: "  " })).toEqual({
      error: "Give the group a name.",
    });
    expect(await createVolunteerGroup({ ...validForm, tone: "PUCE" })).toEqual({
      error: "Choose a colour for the group.",
    });
  });
});

describe("updateVolunteerGroup", () => {
  beforeEach(() => authMock.mockResolvedValue(admin));

  it("allows a group to keep its own name", async () => {
    groupFindManyMock.mockResolvedValue([{ id: "g1", name: "Team Leaders" }]);

    expect(await updateVolunteerGroup("g1", validForm)).toEqual({
      success: true,
    });
    expect(groupUpdateMock).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: expect.objectContaining({ name: "Team Leaders" }),
    });
  });

  it("rejects taking another group's name", async () => {
    groupFindManyMock.mockResolvedValue([
      { id: "g1", name: "Guardian Angels" },
      { id: "g2", name: "Team Leaders" },
    ]);

    expect(await updateVolunteerGroup("g1", validForm)).toEqual({
      error: "A group with this name already exists.",
    });
    expect(groupUpdateMock).not.toHaveBeenCalled();
  });

  it("reports a group that no longer exists", async () => {
    groupFindManyMock.mockResolvedValue([]);

    expect(await updateVolunteerGroup("gone", validForm)).toEqual({
      error: "Group not found.",
    });
  });

  it("reports a duplicate when the database rejects the rename", async () => {
    groupFindManyMock.mockResolvedValue([{ id: "g1", name: "Guardian Angels" }]);
    groupUpdateMock.mockRejectedValue(duplicateNameError());

    expect(await updateVolunteerGroup("g1", validForm)).toEqual({
      error: "A group with this name already exists.",
    });
  });
});

describe("setGroupMembers", () => {
  beforeEach(() => authMock.mockResolvedValue(coordinator));

  it("drops ids the client sent that aren't active profiles", async () => {
    groupFindUniqueMock.mockResolvedValue({
      id: "g1",
      name: "Team Leaders",
      members: [{ id: "p1" }],
    });
    // "p-archived" belongs to someone archived since the dialog was opened.
    profileFindManyMock.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);

    const result = await setGroupMembers("g1", ["p1", "p2", "p-archived", "p2"]);

    expect(profileFindManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["p1", "p2", "p-archived"] }, user: { status: "ACTIVE" } },
      select: { id: true },
    });
    expect(groupUpdateMock).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { members: { set: [{ id: "p1" }, { id: "p2" }] } },
    });
    expect(result.message).toBe("Team Leaders: 1 added.");
  });

  it("reports both directions of a change", async () => {
    groupFindUniqueMock.mockResolvedValue({
      id: "g1",
      name: "Team Leaders",
      members: [{ id: "p1" }, { id: "p2" }],
    });
    profileFindManyMock.mockResolvedValue([{ id: "p3" }]);

    const result = await setGroupMembers("g1", ["p3"]);

    expect(result.message).toBe("Team Leaders: 1 added, 2 removed.");
  });

  it("reports a group that no longer exists", async () => {
    groupFindUniqueMock.mockResolvedValue(null);

    expect(await setGroupMembers("gone", ["p1"])).toEqual({
      error: "Group not found.",
    });
    expect(groupUpdateMock).not.toHaveBeenCalled();
  });
});

describe("setVolunteerGroups", () => {
  beforeEach(() => authMock.mockResolvedValue(coordinator));

  it("drops archived groups the client sent", async () => {
    profileFindUniqueMock.mockResolvedValue({
      id: "p1",
      user: { status: "ACTIVE" },
    });
    // Only the live group comes back from the archived-excluding query.
    groupFindManyMock.mockResolvedValue([{ id: "g1" }]);

    expect(await setVolunteerGroups("p1", ["g1", "g-archived"])).toEqual({
      success: true,
    });
    expect(groupFindManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["g1", "g-archived"] }, isArchived: false },
      select: { id: true },
    });
    expect(profileUpdateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { groups: { set: [{ id: "g1" }] } },
    });
  });

  it("refuses an archived account, whatever the client sends", async () => {
    // The directory hides the menu for archived people; the action is exported,
    // so it has to say no itself.
    profileFindUniqueMock.mockResolvedValue({
      id: "p1",
      user: { status: "ARCHIVED" },
    });

    expect(await setVolunteerGroups("p1", ["g1"])).toEqual({
      error: "Restore this account before changing their groups.",
    });
    expect(profileUpdateMock).not.toHaveBeenCalled();
  });

  it("refuses someone without a volunteer profile", async () => {
    profileFindUniqueMock.mockResolvedValue(null);

    expect(await setVolunteerGroups("nobody", ["g1"])).toEqual({
      error: "This person doesn't have a volunteer profile yet.",
    });
    expect(profileUpdateMock).not.toHaveBeenCalled();
  });
});

describe("getVisibleTeam", () => {
  it("asks only for groups volunteers are allowed to see", async () => {
    authMock.mockResolvedValue(volunteer);
    groupFindManyMock.mockResolvedValue([]);

    await getVisibleTeam();

    expect(groupFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isArchived: false, visibleToVolunteers: true },
      })
    );
  });

  it("returns names only, never a member's email address", async () => {
    authMock.mockResolvedValue(volunteer);
    groupFindManyMock.mockResolvedValue([
      {
        id: "g1",
        name: "Team Leaders",
        description: null,
        tone: "BRAND",
        members: [
          { id: "p1", user: { name: "Aroha Williams", email: "aroha@example.nz" } },
          // Someone who never set a name: fall back to the handle, so the page
          // can't be used to harvest addresses.
          { id: "p2", user: { name: null, email: "hemi@example.nz" } },
        ],
      },
    ]);

    const [group] = await getVisibleTeam();

    expect(group.members).toEqual([
      { id: "p1", name: "Aroha Williams" },
      { id: "p2", name: "hemi" },
    ]);
    expect(JSON.stringify(group)).not.toContain("@");
  });

  it("returns nothing to a signed-out caller", async () => {
    authMock.mockResolvedValue(null);
    expect(await getVisibleTeam()).toEqual([]);
    expect(groupFindManyMock).not.toHaveBeenCalled();
  });
});

describe("getMyGroups", () => {
  it("reads only the caller's own visible groups", async () => {
    authMock.mockResolvedValue(volunteer);
    profileFindUniqueMock.mockResolvedValue({
      groups: [{ id: "g1", name: "Team Leaders", tone: "BRAND" }],
    });

    expect(await getMyGroups()).toEqual([
      { id: "g1", name: "Team Leaders", tone: "BRAND" },
    ]);
    expect(profileFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "vol-user-1" } })
    );
  });

  it("returns nothing when the caller has no profile", async () => {
    authMock.mockResolvedValue(volunteer);
    profileFindUniqueMock.mockResolvedValue(null);

    expect(await getMyGroups()).toEqual([]);
  });

  it("returns nothing to a signed-out caller", async () => {
    authMock.mockResolvedValue(null);
    expect(await getMyGroups()).toEqual([]);
    expect(profileFindUniqueMock).not.toHaveBeenCalled();
  });
});
