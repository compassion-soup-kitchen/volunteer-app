"use server";

import { after, connection } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";
import {
  sendEmail,
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  getBaseUrl,
} from "@/lib/email";
import { applicationDecisionEmail } from "@/lib/email-templates";
import { revalidatePath } from "next/cache";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { Prisma, type Role } from "@prisma/client";
import {
  validateRoleChange,
  isLastActiveAdmin,
  STAFF_ROLES,
  type AssignableRole,
} from "./role-change";
import {
  findDeletionBlocker,
  validateUserDeletion,
  wouldRemoveLastAdmin,
  type AuthoredRecordCounts,
  type ErasedRecordCounts,
} from "./user-deletion";
import { deleteFile } from "@/lib/storage";
import { resolveVolunteerListBuckets } from "./volunteer-list-filter";

// Thrown inside the role-change transaction to roll back a demotion that would
// leave zero active admins; caught and mapped to a user-facing message.
class LastAdminError extends Error {}

// ─── Auth helpers ────────────────────────────────────

async function requireStaff() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !["COORDINATOR", "ADMIN"].includes(session.user.role)
  ) {
    return null;
  }
  return session;
}

// Role escalation is ADMIN-only — coordinators must never be able to grant
// COORDINATOR/ADMIN to themselves or others.
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

// ─── Dashboard ───────────────────────────────────────

export type DashboardStats = {
  activeVolunteers: number;
  pendingApplications: number;
  shiftsThisWeek: number;
  hoursThisMonth: number;
};

export async function getStaffDashboardStats(): Promise<DashboardStats | null> {
  await connection();
  const session = await requireStaff();
  if (!session) return null;

  const db = getDb();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [activeVolunteers, pendingApplications, shiftsThisWeek, attendedSignups] =
    await Promise.all([
      db.volunteerProfile.count({
        // Exclude staff (COORDINATOR/ADMIN) — they aren't counted as volunteers,
        // e.g. someone promoted straight to admin who never volunteered.
        where: {
          status: "ACTIVE",
          user: { status: "ACTIVE", role: { notIn: STAFF_ROLES } },
        },
      }),
      db.application.count({
        where: { status: "PENDING" },
      }),
      db.shift.count({
        where: {
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
      db.shiftSignup.findMany({
        where: {
          status: "ATTENDED",
          shift: {
            date: { gte: monthStart, lte: monthEnd },
          },
        },
        include: {
          shift: { select: { startTime: true, endTime: true } },
        },
      }),
    ]);

  // Calculate hours from attended signups
  let hoursThisMonth = 0;
  for (const signup of attendedSignups) {
    const [startH, startM] = signup.shift.startTime.split(":").map(Number);
    const [endH, endM] = signup.shift.endTime.split(":").map(Number);
    hoursThisMonth += endH - startH + (endM - startM) / 60;
  }

  return {
    activeVolunteers,
    pendingApplications,
    shiftsThisWeek,
    hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
  };
}

export type RecentActivity = {
  type: "application" | "signup" | "shift";
  label: string;
  detail: string;
  time: Date;
};

export async function getRecentActivity(): Promise<RecentActivity[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();

  const [recentApps, recentSignups] = await Promise.all([
    db.application.findMany({
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: {
        volunteer: {
          include: { user: { select: { name: true } } },
        },
      },
    }),
    db.shiftSignup.findMany({
      where: { status: "SIGNED_UP" },
      orderBy: { signedUpAt: "desc" },
      take: 5,
      include: {
        volunteer: {
          include: { user: { select: { name: true } } },
        },
        shift: {
          include: { serviceArea: { select: { name: true } } },
        },
      },
    }),
  ]);

  const activities: RecentActivity[] = [
    ...recentApps.map((app) => ({
      type: "application" as const,
      label: app.volunteer.user.name || "Unknown",
      detail:
        app.status === "PENDING"
          ? "New application submitted"
          : `Application ${app.status.toLowerCase()}`,
      time: app.submittedAt,
    })),
    ...recentSignups.map((s) => ({
      type: "signup" as const,
      label: s.volunteer.user.name || "Unknown",
      detail: `Signed up for ${s.shift.serviceArea.name}`,
      time: s.signedUpAt,
    })),
  ];

  return activities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8);
}

// ─── Applications ────────────────────────────────────

export type ApplicationListItem = {
  id: string;
  status: string;
  submittedAt: Date;
  reviewedAt: Date | null;
  notes: string | null;
  volunteer: {
    id: string;
    phone: string | null;
    status: string;
    mojStatus: string;
    user: {
      name: string | null;
      email: string;
    };
    interests: { id: string; name: string }[];
  };
  reviewedBy: { name: string | null } | null;
};

export type ApplicationFilters = {
  status?: string;
  search?: string;
};

export async function getApplicationsList(
  filters?: ApplicationFilters
): Promise<ApplicationListItem[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();

  const where: Record<string, unknown> = {};
  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  const applications = await db.application.findMany({
    where,
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    include: {
      volunteer: {
        include: {
          user: { select: { name: true, email: true } },
          interests: { select: { id: true, name: true } },
        },
      },
      reviewedBy: { select: { name: true } },
    },
  });

  // Client-side search filter (name or email)
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    return applications.filter(
      (app) =>
        app.volunteer.user.name?.toLowerCase().includes(q) ||
        app.volunteer.user.email.toLowerCase().includes(q)
    );
  }

  return applications;
}

export type ApplicationDetail = {
  id: string;
  status: string;
  submittedAt: Date;
  reviewedAt: Date | null;
  notes: string | null;
  volunteer: {
    id: string;
    phone: string | null;
    address: string | null;
    dateOfBirth: Date | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelationship: string | null;
    bio: string | null;
    availability: unknown;
    skills: string[];
    status: string;
    mojStatus: string;
    createdAt: Date;
    user: {
      name: string | null;
      email: string;
    };
    interests: { id: string; name: string }[];
    signedAgreements: {
      id: string;
      agreementType: string;
      signedAt: Date;
    }[];
  };
  reviewedBy: { name: string | null } | null;
};

export async function getApplicationDetail(
  applicationId: string
): Promise<ApplicationDetail | null> {
  const session = await requireStaff();
  if (!session) return null;

  const db = getDb();
  return db.application.findUnique({
    where: { id: applicationId },
    include: {
      volunteer: {
        include: {
          user: { select: { name: true, email: true } },
          interests: { select: { id: true, name: true } },
          signedAgreements: {
            select: { id: true, agreementType: true, signedAt: true },
          },
        },
      },
      reviewedBy: { select: { name: true } },
    },
  });
}

export async function reviewApplication(
  applicationId: string,
  decision: "APPROVED" | "DECLINED" | "INFO_REQUESTED",
  notes?: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      volunteer: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!application) return { error: "Application not found." };

  try {
    await db.$transaction(async (tx) => {
      // Update application
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: decision,
          notes: notes?.trim() || null,
          reviewedAt: new Date(),
          reviewedById: session.user!.id,
        },
      });

      // Update volunteer profile status based on decision
      if (decision === "APPROVED") {
        await tx.volunteerProfile.update({
          where: { id: application.volunteerId },
          data: { status: "APPROVED_FOR_INDUCTION" },
        });
        // Also upgrade user role to VOLUNTEER
        await tx.user.update({
          where: { id: application.volunteer.userId },
          data: { role: "VOLUNTEER" },
        });
      } else if (decision === "DECLINED") {
        await tx.volunteerProfile.update({
          where: { id: application.volunteerId },
          data: { status: "INACTIVE" },
        });
      }
      // INFO_REQUESTED doesn't change profile status
    });

    if (decision === "APPROVED") {
      after(() =>
        sendPushToUsers([application.volunteer.userId], {
          title: "Your application is approved 🎉",
          body: "Nau mai, haere mai! We'd love to have you on the team — your induction details are on the way.",
          data: { url: "/onboarding" },
        })
      );
    }

    // Email the applicant the outcome. Web applicants have no push tokens,
    // so email is the only channel that reliably reaches them.
    const applicantEmail = application.volunteer.user.email;
    if (applicantEmail) {
      const firstName = application.volunteer.user.name?.split(" ")[0] ?? null;
      const { subject, content } = applicationDecisionEmail(
        firstName,
        decision,
        getBaseUrl()
      );
      after(() =>
        sendEmail({
          to: applicantEmail,
          subject,
          html: buildBrandedEmailHtml(content),
          text: buildBrandedEmailText(content),
        })
      );
    }

    revalidatePath("/staff/applications");
    revalidatePath("/staff/dashboard");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("Review application error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Volunteers Directory ────────────────────────────

export type VolunteerListItem = {
  // The VolunteerProfile id for applicants; the User id for people who signed in
  // but never applied (no profile). Both are unique, so it's safe as a React key.
  id: string;
  // False for people who signed in but never submitted an application — they
  // have no profile, so status/mojStatus/interests/shifts are absent.
  hasProfile: boolean;
  phone: string | null;
  status: string | null;
  mojStatus: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    status: string;
    archivedAt: Date | null;
    archivedReason: string | null;
  };
  interests: { id: string; name: string }[];
  _count: {
    shiftSignups: number;
  };
};

export type VolunteerFilters = {
  status?: string;
  // User account status: "ACTIVE" (default), "ARCHIVED", or "ALL"
  userStatus?: "ACTIVE" | "ARCHIVED" | "ALL";
  search?: string;
};

export async function getVolunteersList(
  filters?: VolunteerFilters
): Promise<VolunteerListItem[]> {
  const session = await requireStaff();
  if (!session) return [];

  const db = getDb();

  const statusFilter = filters?.status ?? "ALL";
  // Default to ACTIVE accounts unless explicitly requested otherwise
  const userStatus = filters?.userStatus ?? "ACTIVE";

  // "No application yet" people are Users with role PUBLIC and no profile. The
  // pure helper decides which groups to query and how to filter applicants.
  const { includeApplicants, includeNoApplication, applicantStatus } =
    resolveVolunteerListBuckets(statusFilter);

  const where: Record<string, unknown> = {};
  if (applicantStatus) {
    where.status = applicantStatus;
  }
  if (userStatus !== "ALL") {
    where.user = { status: userStatus };
  }

  const [profiles, noApplicationUsers] = await Promise.all([
    includeApplicants
      ? db.volunteerProfile.findMany({
          where,
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                archivedAt: true,
                archivedReason: true,
              },
            },
            interests: { select: { id: true, name: true } },
            _count: {
              select: {
                shiftSignups: { where: { status: { not: "CANCELLED" } } },
              },
            },
          },
        })
      : Promise.resolve([]),
    includeNoApplication
      ? db.user.findMany({
          where: {
            role: "PUBLIC",
            volunteerProfile: { is: null },
            ...(userStatus !== "ALL" ? { status: userStatus } : {}),
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            archivedAt: true,
            archivedReason: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const applicantItems: VolunteerListItem[] = profiles.map((p) => ({
    id: p.id,
    hasProfile: true,
    phone: p.phone,
    status: p.status,
    mojStatus: p.mojStatus,
    createdAt: p.createdAt,
    user: p.user,
    interests: p.interests,
    _count: p._count,
  }));

  const noApplicationItems: VolunteerListItem[] = noApplicationUsers.map(
    (u) => ({
      id: u.id,
      hasProfile: false,
      phone: null,
      status: null,
      mojStatus: null,
      createdAt: u.createdAt,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        archivedAt: u.archivedAt,
        archivedReason: u.archivedReason,
      },
      interests: [],
      _count: { shiftSignups: 0 },
    })
  );

  // Applicants first (in their status/recency order), then the people who signed
  // in but never applied (most recent first).
  const volunteers = [...applicantItems, ...noApplicationItems];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    return volunteers.filter(
      (v) =>
        v.user.name?.toLowerCase().includes(q) ||
        v.user.email.toLowerCase().includes(q)
    );
  }

  return volunteers;
}

export async function updateVolunteerStatus(
  volunteerId: string,
  status: "ACTIVE" | "INACTIVE" | "AWAITING_VETTING" | "APPROVED_FOR_INDUCTION"
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { id: volunteerId },
  });

  if (!profile) return { error: "Volunteer not found." };

  try {
    await db.volunteerProfile.update({
      where: { id: volunteerId },
      data: { status },
    });

    revalidatePath("/staff/volunteers");
    revalidatePath("/staff/dashboard");
    return { success: true };
  } catch (e) {
    console.error("Update volunteer status error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Archive / Restore Volunteer Account ─────────────

export async function archiveVolunteer(
  userId: string,
  reason?: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) return { error: "Volunteer not found." };

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        archivedReason: reason?.trim() || null,
        archivedById: session.user!.id,
      },
    });

    revalidatePath("/staff/volunteers");
    revalidatePath("/staff/dashboard");
    return { success: true };
  } catch (e) {
    console.error("Archive volunteer error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function restoreVolunteer(
  userId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) return { error: "Volunteer not found." };

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        archivedAt: null,
        archivedReason: null,
        archivedById: null,
      },
    });

    revalidatePath("/staff/volunteers");
    revalidatePath("/staff/dashboard");
    return { success: true };
  } catch (e) {
    console.error("Restore volunteer error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Delete Account (ADMIN only, permanent) ──────────

export type UserDeletionSummary = {
  userId: string;
  name: string | null;
  email: string;
  role: Role;
  isArchived: boolean;
  // What deleting them destroys.
  erases: ErasedRecordCounts;
  // What they authored for the org (any of this blocks deletion).
  authored: AuthoredRecordCounts;
  // Non-null when this account can't be deleted at all, whatever is typed.
  blocker: string | null;
};

type DeletionContext = {
  summary: UserDeletionSummary;
  profileId: string | null;
  isLastAdmin: boolean;
};

/**
 * Everything both the confirm dialog and the delete itself need to know about a
 * target account. Shared so the numbers an admin agrees to can't drift from the
 * rules the action enforces a moment later.
 */
async function loadDeletionContext(
  actorUserId: string,
  userId: string
): Promise<DeletionContext | null> {
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

  const authored: AuthoredRecordCounts = {
    shifts: user._count.createdShifts,
    trainingSessions: user._count.createdTraining,
    announcements: user._count.createdAnnouncements,
  };
  const isLastAdmin = wouldRemoveLastAdmin(user.role, otherActiveAdmins);

  return {
    profileId,
    isLastAdmin,
    summary: {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isArchived: user.status === "ARCHIVED",
      authored,
      erases: {
        shiftSignups,
        attendedShifts,
        trainingAttendances,
        documents,
        signedAgreements,
      },
      blocker: findDeletionBlocker({
        actorUserId,
        targetUserId: user.id,
        isLastAdmin,
        authored,
      }),
    },
  };
}

/**
 * What an admin is about to destroy, for the confirmation dialog. Read-only -
 * nothing is deleted until `deleteUser` is called with the typed confirmation.
 */
export async function getUserDeletionSummary(
  userId: string
): Promise<UserDeletionSummary | { error: string }> {
  const session = await requireAdmin();
  if (!session) return { error: "Not authorised." };

  const context = await loadDeletionContext(session.user!.id, userId);
  if (!context) return { error: "That account no longer exists." };

  return context.summary;
}

/**
 * Permanently erase an account and everything that belongs to it: profile,
 * application, shift signups, training attendance, uploaded documents, signed
 * agreements, push tokens, and sign-in credentials. Irreversible, and their
 * hours leave reporting with them - archiving is the right tool for anyone who
 * has simply stopped volunteering.
 *
 * ADMIN-only, and guarded by `validateUserDeletion`: never yourself, never the
 * last admin, never someone who created shifts, training, or pānui.
 */
export async function deleteUser(
  userId: string,
  confirmation: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAdmin();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const context = await loadDeletionContext(session.user!.id, userId);
  if (!context) return { error: "That account no longer exists." };
  const { summary } = context;

  const validationError = validateUserDeletion({
    actorUserId: session.user!.id,
    targetUserId: summary.userId,
    targetRole: summary.role,
    targetEmail: summary.email,
    isLastAdmin: context.isLastAdmin,
    authored: summary.authored,
    confirmation,
  });
  if (validationError) return { error: validationError };

  // Read the storage keys before the rows go: deleting the User cascades the
  // Document rows away, but the files behind them live in Garage and would be
  // orphaned with no row left to find them by.
  const documentKeys = context.profileId
    ? (
        await db.document.findMany({
          where: { volunteerId: context.profileId },
          select: { fileUrl: true },
        })
      ).map((d) => d.fileUrl)
    : [];

  try {
    // The pre-check above closes the sequential last-admin case, but its count
    // was read before this delete - two admins deleting two *different* admins
    // concurrently could each see one remaining and both commit. Delete and
    // re-count inside one serializable transaction so they can't both succeed.
    await db.$transaction(
      async (tx) => {
        await tx.user.delete({ where: { id: summary.userId } });

        if (summary.role === "ADMIN") {
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
        error: "You can't delete the last admin. Promote someone else first.",
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
            "The kitchen's records still reference this account. Archive it instead.",
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
    console.error("Delete user error:", e);
    return { error: "Something went wrong. Please try again." };
  }

  // The account is gone, so this line is the only remaining trace of who did
  // it. Deliberately records ids and counts, not the name or email we were
  // just asked to erase.
  console.warn("[audit] user permanently deleted", {
    actorId: session.user!.id,
    targetId: summary.userId,
    targetRole: summary.role,
    erased: summary.erases,
  });

  // After the commit: the rows are gone either way, and a storage hiccup
  // shouldn't fail a deletion the admin has already been told succeeded.
  after(async () => {
    for (const key of documentKeys) {
      try {
        await deleteFile(key);
      } catch (e) {
        console.error("Delete user document file error:", key, e);
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

// ─── Role management (ADMIN only) ────────────────────

export async function updateUserRole(
  userId: string,
  role: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAdmin();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
      volunteerProfile: { select: { id: true } },
    },
  });

  if (!user) return { error: "Volunteer not found." };

  const hasProfile = user.volunteerProfile !== null;
  const targetCurrentRole = user.role;
  const isTargetLastAdmin = isLastActiveAdmin(
    targetCurrentRole,
    await db.user.count({ where: { role: "ADMIN", status: "ACTIVE" } })
  );

  const validationError = validateRoleChange({
    actorUserId: session.user!.id,
    targetUserId: user.id,
    targetCurrentRole,
    newRole: role,
    targetIsArchived: user.status === "ARCHIVED",
    isTargetLastAdmin,
    targetHasProfile: hasProfile,
  });
  if (validationError) return { error: validationError };

  const demotingAnAdmin = targetCurrentRole === "ADMIN" && role !== "ADMIN";

  try {
    // The pre-check above closes the sequential last-admin case, but the count
    // it used was read before this update — two admins demoting two *different*
    // admins concurrently could each see 2 remaining and both commit, zeroing
    // out all admins. Apply the write and re-count inside one serializable
    // transaction so those two demotions can't both succeed.
    await db.$transaction(
      async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { role: role as AssignableRole },
        });

        // A person who signed in but never applied has no VolunteerProfile.
        // Promoting them makes them a full member of the system, so give them a
        // profile — otherwise the roster, hours, and their own directory row
        // (all keyed on the profile) would be missing.
        if (!hasProfile) {
          await tx.volunteerProfile.create({
            data: { userId: user.id, status: "ACTIVE" },
          });
        }

        if (demotingAnAdmin) {
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

    revalidatePath("/staff/volunteers");
    revalidatePath("/staff/dashboard");
    return { success: true };
  } catch (e) {
    if (e instanceof LastAdminError) {
      return {
        error: "You can't remove the last admin. Promote someone else first.",
      };
    }
    // A concurrent conflicting role change aborts one transaction under
    // serializable isolation — safe to retry.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2034"
    ) {
      return {
        error: "Another role change happened at the same time. Please try again.",
      };
    }
    console.error("Update user role error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateMojStatus(
  volunteerId: string,
  mojStatus: "NOT_STARTED" | "SUBMITTED" | "CLEARED" | "FLAGGED"
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireStaff();
  if (!session) return { error: "Not authorised." };

  const db = getDb();
  try {
    await db.volunteerProfile.update({
      where: { id: volunteerId },
      data: { mojStatus },
    });

    revalidatePath("/staff/volunteers");
    revalidatePath("/staff/applications");
    return { success: true };
  } catch (e) {
    console.error("Update MOJ status error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}
