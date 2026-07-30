/**
 * Permanently erasing a user account, and reading what that would cost.
 *
 * Two callers arrive here with different authority and the same destination:
 * an admin deleting somebody else (`staff-actions.deleteUser`) and a person
 * deleting their own account (`account-actions.deleteOwnAccount`, and the
 * mobile app's `DELETE /api/v1/me`). The guardrails differ - see
 * `@/lib/user-deletion` - but what "erased" *means* must not, so the reading
 * and the writing both live here.
 *
 * What goes: the user row and everything cascading off it - profile,
 * application, shift signups, training attendance, documents (rows and the
 * files behind them), signed agreements, event RSVPs, push tokens, and
 * sign-in credentials. What stays: shifts, training sessions, pānui and events
 * they created for the organisation, with the author de-attributed rather than
 * deleted (see `Announcement.createdById` in the schema).
 */

import { after } from "next/server";
import { Prisma, type Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { deleteFile } from "@/lib/storage";
import { revokeAppleToken } from "@/lib/apple-api";
import {
  wouldRemoveLastAdmin,
  type AuthoredRecordCounts,
  type ErasedRecordCounts,
} from "@/lib/user-deletion";

/** Everything both a confirmation screen and the erasure itself need to know. */
export type AccountErasureFacts = {
  userId: string;
  name: string | null;
  email: string;
  role: Role;
  isArchived: boolean;
  /** What erasing them destroys. */
  erases: ErasedRecordCounts;
  /** What they wrote for the org - kept, but no longer attributed to them. */
  authored: AuthoredRecordCounts;
  /** True when erasing them would leave zero active admins. */
  isLastAdmin: boolean;
  profileId: string | null;
};

/** Thrown inside the transaction to roll back a last-admin deletion. */
class LastAdminError extends Error {}

/**
 * Reads the shape of an account: who they are, what erasing them destroys, and
 * whether they're the last admin standing. Read-only - nothing is deleted
 * until `eraseUserAccount` is called.
 */
export async function loadAccountErasureFacts(
  userId: string
): Promise<AccountErasureFacts | null> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      volunteerProfile: { select: { id: true } },
      _count: {
        select: {
          createdShifts: true,
          createdTraining: true,
          createdAnnouncements: true,
        },
      },
    },
  });

  if (!user) return null;

  const profileId = user.volunteerProfile?.id ?? null;

  // Exclude the target from the admin count: an *archived* admin isn't in the
  // active tally, so counting the whole table would read as "one admin left"
  // and wrongly block deleting them.
  const [
    shiftSignups,
    attendedShifts,
    trainingAttendances,
    documents,
    signedAgreements,
    otherActiveAdmins,
  ] = await Promise.all([
    profileId
      ? db.shiftSignup.count({
          where: { volunteerId: profileId, status: { not: "CANCELLED" } },
        })
      : Promise.resolve(0),
    profileId
      ? db.shiftSignup.count({
          where: { volunteerId: profileId, status: "ATTENDED" },
        })
      : Promise.resolve(0),
    profileId
      ? db.trainingAttendance.count({ where: { volunteerId: profileId } })
      : Promise.resolve(0),
    profileId
      ? db.document.count({ where: { volunteerId: profileId } })
      : Promise.resolve(0),
    profileId
      ? db.signedAgreement.count({ where: { volunteerId: profileId } })
      : Promise.resolve(0),
    db.user.count({
      where: { role: "ADMIN", status: "ACTIVE", id: { not: userId } },
    }),
  ]);

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isArchived: user.status === "ARCHIVED",
    profileId,
    isLastAdmin: wouldRemoveLastAdmin(user.role, otherActiveAdmins),
    authored: {
      shifts: user._count.createdShifts,
      trainingSessions: user._count.createdTraining,
      announcements: user._count.createdAnnouncements,
    },
    erases: {
      shiftSignups,
      attendedShifts,
      trainingAttendances,
      documents,
      signedAgreements,
    },
  };
}

/**
 * Erases the account. Callers must have run their own guardrails first -
 * this checks nothing but the last-admin invariant, which has to be re-checked
 * inside the transaction to hold under concurrency.
 *
 * `actorId` is for the audit line alone, and equals `facts.userId` when
 * somebody deletes themselves.
 */
export async function eraseUserAccount(
  facts: AccountErasureFacts,
  actorId: string
): Promise<{ success: true } | { error: string }> {
  const db = getDb();

  // Read the storage keys before the rows go: deleting the User cascades the
  // Document rows away, but the files behind them live in the bucket and would
  // be orphaned with no row left to find them by.
  const documentKeys = facts.profileId
    ? (
        await db.document.findMany({
          where: { volunteerId: facts.profileId },
          select: { fileUrl: true },
        })
      ).map((d) => d.fileUrl)
    : [];

  // Likewise for the Apple authorisation: the Account row cascades away with
  // the user, taking the only refresh token we could revoke with.
  const appleRefreshTokens = (
    await db.account.findMany({
      where: { userId: facts.userId, provider: "apple" },
      select: { refresh_token: true },
    })
  )
    .map((a) => a.refresh_token)
    .filter((token): token is string => Boolean(token));

  try {
    // The caller's pre-check closes the sequential last-admin case, but its
    // count was read before this delete - two admins deleting two *different*
    // admins concurrently could each see one remaining and both commit. Delete
    // and re-count inside one serializable transaction so they can't both
    // succeed.
    await db.$transaction(
      async (tx) => {
        await tx.user.delete({ where: { id: facts.userId } });

        if (facts.role === "ADMIN") {
          const remainingAdmins = await tx.user.count({
            where: { role: "ADMIN", status: "ACTIVE" },
          });
          if (remainingAdmins < 1) {
            throw new LastAdminError();
          }
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (e) {
    if (e instanceof LastAdminError) {
      return {
        error:
          "That would leave the kitchen with no admin at all. Make someone else an admin first.",
      };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // Deleted by someone else between the load above and here.
      if (e.code === "P2025") return { error: "That account no longer exists." };
      // A required relation we don't pre-check still points at them. Refuse
      // rather than leave the records half-orphaned.
      if (e.code === "P2003" || e.code === "P2014") {
        return {
          error:
            "The kitchen's records still reference this account. Please get in touch with the team.",
        };
      }
      // A concurrent conflicting write aborts one transaction under
      // serializable isolation - safe to retry.
      if (e.code === "P2034") {
        return {
          error: "Another change happened at the same time. Please try again.",
        };
      }
    }
    console.error("Erase user account error:", e);
    return { error: "Something went wrong. Please try again." };
  }

  // The account is gone, so this line is the only remaining trace of what
  // happened. Deliberately records ids and counts, not the name or email we
  // were just asked to erase.
  console.warn("[audit] user permanently deleted", {
    actorId,
    targetId: facts.userId,
    targetRole: facts.role,
    selfService: actorId === facts.userId,
    erased: facts.erases,
    deattributed: facts.authored,
  });

  // After the commit: the rows are gone either way, and a storage hiccup or an
  // unreachable Apple shouldn't fail a deletion the person has already been
  // told succeeded.
  after(async () => {
    for (const key of documentKeys) {
      try {
        await deleteFile(key);
      } catch (e) {
        console.error("Delete user document file error:", key, e);
      }
    }

    // Required by App Store guideline 5.1.1(v), and the only thing that lets
    // this person sign up with Apple again later - without it Apple treats
    // their next sign-in as a repeat authorisation and withholds the email.
    for (const token of appleRefreshTokens) {
      const result = await revokeAppleToken(token);
      if (!result.ok) {
        console.error(
          "[audit] Apple token revocation did not complete for deleted user",
          { targetId: facts.userId, reason: result.reason }
        );
      }
    }
  });

  revalidatePath("/staff/volunteers");
  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/applications");
  revalidatePath("/staff/documents");
  revalidatePath("/staff/reports");
  return { success: true };
}
