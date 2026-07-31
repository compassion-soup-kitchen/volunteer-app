"use server";

import { requireActiveSession } from "@/lib/action-auth";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma, type GroupTone } from "@prisma/client";
import {
  GROUP_INELIGIBLE_STATUSES,
  canHoldGroups,
  describeMembershipChange,
  diffMembership,
  findNameClash,
  resolveGroupMemberIds,
  validateGroupInput,
  type GroupChip,
} from "@/lib/volunteer-groups";

// Groups label people; they grant nothing. Coordinators run the roster day to
// day, so they can maintain groups alongside admins - unlike role changes,
// which stay admin-only because they hand out access.
async function requireStaff() {
  const session = await requireActiveSession();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role)
  ) {
    return null;
  }
  return session;
}

export type VolunteerGroupWithCount = {
  id: string;
  name: string;
  description: string | null;
  tone: GroupTone;
  visibleToVolunteers: boolean;
  isArchived: boolean;
  /**
   * Who is in the group, straight from the membership rather than resolved
   * through the candidate list - someone who has since been archived or moved
   * back into vetting is still a member, and the card should say so rather than
   * quietly counting them and not naming them.
   */
  members: { id: string; name: string }[];
  _count: { members: number };
};

/** Every group, archived last, with who is in it. Staff only. */
export async function getVolunteerGroups(): Promise<VolunteerGroupWithCount[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();
  const groups = await db.volunteerGroup.findMany({
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
    include: {
      members: {
        orderBy: { user: { name: "asc" } },
        select: { id: true, user: { select: { name: true, email: true } } },
      },
      _count: { select: { members: true } },
    },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    tone: group.tone,
    visibleToVolunteers: group.visibleToVolunteers,
    isArchived: group.isArchived,
    members: group.members.map((member) => ({
      id: member.id,
      name: member.user.name || member.user.email,
    })),
    _count: group._count,
  }));
}

/** The active groups a person can be put into - for pickers and filters. */
export async function getAssignableGroups(): Promise<GroupChip[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();
  return db.volunteerGroup.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, tone: true },
  });
}

export type GroupCandidate = {
  /** VolunteerProfile id - what membership is stored against. */
  id: string;
  name: string;
  email: string;
};

// Who may hold a group, as a Prisma filter. Shared by the picker that offers
// candidates and the writes that accept them, so the rule can't drift between
// what staff are shown and what the server will save.
const GROUP_ELIGIBLE_WHERE = {
  user: { status: "ACTIVE" },
  status: { notIn: GROUP_INELIGIBLE_STATUSES },
} as const;

/** Everyone who can be put in a group: active, vetted people with a profile. */
export async function getGroupCandidates(): Promise<GroupCandidate[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();
  const profiles = await db.volunteerProfile.findMany({
    where: GROUP_ELIGIBLE_WHERE,
    orderBy: { user: { name: "asc" } },
    select: {
      id: true,
      user: { select: { name: true, email: true } },
    },
  });

  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.user.name || profile.user.email,
    email: profile.user.email,
  }));
}

const DUPLICATE_NAME = "A group with this name already exists." as const;

/**
 * Whether a write failed because the name is taken. `findNameClash` reads
 * before writing, so two saves racing with the same name can both pass it - the
 * `nameKey` unique index settles it, and the loser gets the same message the
 * pre-check would have given.
 */
function isDuplicateNameError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

type GroupFormInput = {
  name: string;
  description?: string | null;
  tone: string;
  visibleToVolunteers: boolean;
};

// Every surface that shows a badge has to be refreshed when groups change:
// staff pages carry them beside names, and volunteers see the ones marked
// visible on their own profile and the team page.
function revalidateGroupSurfaces() {
  revalidatePath("/staff/groups");
  revalidatePath("/staff/volunteers");
  // Every shift detail page draws these badges beside its signups and offers,
  // and a group edit belongs to no shift in particular. The "layout" type is a
  // path-derived tag, not a layout.tsx boundary: Next tags each rendered route
  // with a `/layout` entry for every ancestor path (see getDerivedTags in
  // next/dist/server/lib/implicit-tags), so this reaches the nested
  // /staff/shifts/[shiftId] pages without needing a layout file to exist here.
  revalidatePath("/staff/shifts", "layout");
  revalidatePath("/team");
  revalidatePath("/profile");
}

export async function createVolunteerGroup(
  input: GroupFormInput
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const validated = validateGroupInput(input);
  if ("error" in validated) return validated;

  const db = getDb();
  const existing = await db.volunteerGroup.findMany({
    select: { id: true, name: true },
  });
  if (findNameClash(existing, validated.data.name)) {
    return { error: DUPLICATE_NAME };
  }

  try {
    await db.volunteerGroup.create({ data: validated.data });
    revalidateGroupSurfaces();
    return { success: true };
  } catch (error) {
    if (isDuplicateNameError(error)) return { error: DUPLICATE_NAME };
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateVolunteerGroup(
  id: string,
  input: GroupFormInput
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const validated = validateGroupInput(input);
  if ("error" in validated) return validated;

  const db = getDb();
  const existing = await db.volunteerGroup.findMany({
    select: { id: true, name: true },
  });
  if (!existing.some((group) => group.id === id)) {
    return { error: "Group not found." };
  }
  if (findNameClash(existing, validated.data.name, id)) {
    return { error: DUPLICATE_NAME };
  }

  try {
    await db.volunteerGroup.update({ where: { id }, data: validated.data });
    revalidateGroupSurfaces();
    return { success: true };
  } catch (error) {
    if (isDuplicateNameError(error)) return { error: DUPLICATE_NAME };
    return { error: "Something went wrong. Please try again." };
  }
}

export async function toggleVolunteerGroupArchive(
  id: string
): Promise<{ error?: string; success?: boolean; isArchived?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const group = await db.volunteerGroup.findUnique({ where: { id } });
  if (!group) return { error: "Group not found." };

  try {
    const updated = await db.volunteerGroup.update({
      where: { id },
      data: { isArchived: !group.isArchived },
    });
    revalidateGroupSurfaces();
    return { success: true, isArchived: updated.isArchived };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Delete a group outright. Only the label goes - membership rows fall away with
 * it and nobody's record is touched, which is why this doesn't need the care
 * archiving a person does.
 */
export async function deleteVolunteerGroup(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const group = await db.volunteerGroup.findUnique({ where: { id } });
  if (!group) return { error: "Group not found." };

  try {
    await db.volunteerGroup.delete({ where: { id } });
    revalidateGroupSurfaces();
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

/** Replace a group's membership wholesale - the manage-members dialog. */
export async function setGroupMembers(
  groupId: string,
  memberIds: string[]
): Promise<{ error?: string; success?: boolean; message?: string }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const group = await db.volunteerGroup.findUnique({
    where: { id: groupId },
    include: { members: { select: { id: true } } },
  });
  if (!group) return { error: "Group not found." };

  const unique = [...new Set(memberIds)];
  // Joining a crew means clearing the eligibility bar - a stale id from an open
  // dialog shouldn't resurrect someone archived meanwhile, and nobody should be
  // filed in before they've been through vetting. Staying in it doesn't: an
  // existing member who has since been archived or sent back to vetting keeps
  // their place until someone actually unticks them.
  const eligible = await db.volunteerProfile.findMany({
    where: { id: { in: unique }, ...GROUP_ELIGIBLE_WHERE },
    select: { id: true },
  });
  const existingIds = group.members.map((member) => member.id);
  const validIds = resolveGroupMemberIds({
    submitted: unique,
    eligible: eligible.map((profile) => profile.id),
    existing: existingIds,
  });

  const { added, removed } = diffMembership(existingIds, validIds);

  try {
    await db.volunteerGroup.update({
      where: { id: groupId },
      data: { members: { set: validIds.map((id) => ({ id })) } },
    });
    revalidateGroupSurfaces();
    return {
      success: true,
      message: describeMembershipChange(added.length, removed.length, group.name),
    };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Set one person's groups - the directory's per-row shortcut.
 *
 * Returns the membership that actually stuck. The directory reads its group
 * list once and keeps it for the life of the page, so a coordinator can tick a
 * group another coordinator archived in the meantime; the id is dropped here,
 * and the caller needs to know that rather than reporting an addition that
 * never happened.
 */
export async function setVolunteerGroups(
  volunteerProfileId: string,
  groupIds: string[]
): Promise<{ error?: string; success?: boolean; groupIds?: string[] }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { id: volunteerProfileId },
    select: {
      id: true,
      status: true,
      user: { select: { status: true } },
      // Membership in archived groups, which the directory never sees and so
      // can never send back. Archiving a group keeps its people (the page says
      // as much), and a write here replaces the whole relation - so these have
      // to be carried through by hand or restoring the group would find it
      // half empty.
      groups: { where: { isArchived: true }, select: { id: true } },
    },
  });
  if (!profile) return { error: "This person doesn't have a volunteer profile yet." };
  // The directory hides the Groups menu for archived and unvetted people, but
  // that is the client talking - this action is exported, and the membership
  // picker filters the same two cases out on the server.
  if (profile.user.status !== "ACTIVE") {
    return { error: "Restore this account before changing their groups." };
  }
  if (!canHoldGroups(profile.status)) {
    return {
      error: "Finish their application and vetting before adding them to a group.",
    };
  }

  // Archived groups are kept off the picker, so a submission that names one is
  // stale - drop it rather than silently re-filing someone under a retired crew.
  const active = await db.volunteerGroup.findMany({
    where: { id: { in: [...new Set(groupIds)] }, isArchived: false },
    select: { id: true },
  });

  const savedIds = [
    ...active.map((group) => group.id),
    ...profile.groups.map((group) => group.id),
  ];

  try {
    await db.volunteerProfile.update({
      where: { id: volunteerProfileId },
      data: { groups: { set: savedIds.map((id) => ({ id })) } },
    });
    revalidateGroupSurfaces();
    return { success: true, groupIds: savedIds };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export type TeamGroup = {
  id: string;
  name: string;
  description: string | null;
  tone: GroupTone;
  members: { id: string; name: string }[];
};

/**
 * The groups volunteers are allowed to see, with who's in them - "who do I ask
 * about this?" answered without handing out anyone's contact details.
 */
export async function getVisibleTeam(): Promise<TeamGroup[]> {
  const session = await requireActiveSession();
  if (!session?.user?.id) return [];

  const db = getDb();
  const groups = await db.volunteerGroup.findMany({
    where: { isArchived: false, visibleToVolunteers: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      tone: true,
      members: {
        where: { status: "ACTIVE", user: { status: "ACTIVE" } },
        orderBy: { user: { name: "asc" } },
        select: { id: true, user: { select: { name: true, email: true } } },
      },
    },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    tone: group.tone,
    members: group.members.map((member) => ({
      id: member.id,
      // Fall back to the email handle rather than the address itself - a team
      // page shouldn't be a way to harvest everyone's email.
      name: member.user.name || member.user.email.split("@")[0],
    })),
  }));
}

/** The visible groups the signed-in volunteer belongs to. */
export async function getMyGroups(): Promise<GroupChip[]> {
  const session = await requireActiveSession();
  if (!session?.user?.id) return [];

  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      groups: {
        where: { isArchived: false, visibleToVolunteers: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, tone: true },
      },
    },
  });

  return profile?.groups ?? [];
}
