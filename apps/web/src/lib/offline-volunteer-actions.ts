"use server";

import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/action-auth";
import { getDb } from "@/lib/db";
import {
  dateOnlyOf,
  parseDateOnly,
  todayInAppZone,
} from "@/lib/date-only";
import {
  dateOfBirthError,
  firstOfflineIssue,
  offlineVolunteerDetails,
  offlineVolunteerInput,
  roleForStartStatus,
  type OfflineVolunteerDetailsData,
  type OfflineVolunteerFormData,
} from "@/lib/offline-volunteer";

type Result = { error?: string; success?: boolean };

/** An existing offline record, as the edit form needs it. */
export type OfflineVolunteerValues = OfflineVolunteerDetailsData & {
  userId: string;
};

const EMAIL_TAKEN =
  "Someone already has that email address. Find them in the directory instead.";

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "P2002";
}

/** Service areas must exist and be in use. */
async function checkServiceAreas(ids: string[]): Promise<string | null> {
  if (ids.length === 0) return null;
  const count = await getDb().serviceArea.count({
    where: { id: { in: ids }, isArchived: false },
  });
  return count === ids.length ? null : "One of those service areas is no longer in use.";
}

/**
 * Adds someone who volunteers without the app. They get a record like anyone
 * else's - profile, status, vetting - but no password, so they can't sign in.
 * If staff add an email, the volunteer can later take the record over by
 * resetting a password from the sign-in page.
 */
export async function createOfflineVolunteer(
  data: OfflineVolunteerFormData
): Promise<Result & { userId?: string }> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const parsed = offlineVolunteerInput.safeParse(data);
  if (!parsed.success) return { error: firstOfflineIssue(parsed.error) };
  const input = parsed.data;

  const dobError = dateOfBirthError(input.dateOfBirth, todayInAppZone());
  if (dobError) return { error: dobError };
  const areaError = await checkServiceAreas(input.serviceAreaIds);
  if (areaError) return { error: areaError };

  const db = getDb();
  try {
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: roleForStartStatus(input.status),
        isOffline: true,
        volunteerProfile: {
          create: {
            status: input.status,
            mojStatus: input.mojStatus,
            phone: input.phone,
            address: input.address,
            dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : null,
            emergencyContactName: input.emergencyContactName,
            emergencyContactPhone: input.emergencyContactPhone,
            emergencyContactRelationship: input.emergencyContactRelationship,
            bio: input.bio,
            interests: { connect: input.serviceAreaIds.map((id) => ({ id })) },
          },
        },
      },
      select: { id: true },
    });

    revalidatePath("/staff/volunteers");
    revalidatePath("/staff/dashboard");
    return { success: true, userId: user.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: EMAIL_TAKEN };
    console.error("createOfflineVolunteer failed:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/** The record's current details, or null unless it's an offline volunteer. */
export async function getOfflineVolunteerValues(
  userId: string
): Promise<OfflineVolunteerValues | null> {
  const session = await requireStaffSession();
  if (!session) return null;

  const user = await getDb().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isOffline: true,
      volunteerProfile: {
        select: {
          phone: true,
          address: true,
          dateOfBirth: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelationship: true,
          bio: true,
          interests: { select: { id: true } },
        },
      },
    },
  });
  if (!user?.isOffline || !user.volunteerProfile) return null;

  const profile = user.volunteerProfile;
  return {
    userId: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    dateOfBirth: profile.dateOfBirth ? dateOnlyOf(profile.dateOfBirth) : "",
    emergencyContactName: profile.emergencyContactName ?? "",
    emergencyContactPhone: profile.emergencyContactPhone ?? "",
    emergencyContactRelationship: profile.emergencyContactRelationship ?? "",
    bio: profile.bio ?? "",
    serviceAreaIds: profile.interests.map((area) => area.id),
  };
}

/**
 * Keeps an offline volunteer's details current. Only offline records: anyone
 * who uses the app owns their own details. Status and vetting are changed
 * from the record page, as for everyone else.
 */
export async function updateOfflineVolunteer(
  userId: string,
  data: OfflineVolunteerDetailsData
): Promise<Result> {
  const session = await requireStaffSession();
  if (!session) return { error: "Not authorised." };

  const parsed = offlineVolunteerDetails.safeParse(data);
  if (!parsed.success) return { error: firstOfflineIssue(parsed.error) };
  const input = parsed.data;

  const dobError = dateOfBirthError(input.dateOfBirth, todayInAppZone());
  if (dobError) return { error: dobError };
  const areaError = await checkServiceAreas(input.serviceAreaIds);
  if (areaError) return { error: areaError };

  const db = getDb();
  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { isOffline: true, volunteerProfile: { select: { id: true } } },
  });
  if (!existing?.volunteerProfile) return { error: "That volunteer no longer exists." };
  if (!existing.isOffline) {
    return { error: "They use the app now, so their details are theirs to change." };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        email: input.email,
        volunteerProfile: {
          update: {
            phone: input.phone,
            address: input.address,
            dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : null,
            emergencyContactName: input.emergencyContactName,
            emergencyContactPhone: input.emergencyContactPhone,
            emergencyContactRelationship: input.emergencyContactRelationship,
            bio: input.bio,
            interests: { set: input.serviceAreaIds.map((id) => ({ id })) },
          },
        },
      },
    });

    revalidatePath("/staff/volunteers");
    revalidatePath(`/staff/volunteers/${userId}`);
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: EMAIL_TAKEN };
    console.error("updateOfflineVolunteer failed:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
