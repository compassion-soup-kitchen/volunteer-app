import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { MutationResult } from "./volunteer-shifts";

// ─── Types ──────────────────────────────────────────────

export type ApplicationFormData = {
  // Contact
  phone: string;
  address: string;
  dateOfBirth: string; // ISO date string
  // Emergency
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  // Availability
  availability: Record<string, string[]>; // { monday: ["morning", "afternoon"], ... }
  // Interests
  serviceAreaIds: string[];
  // Skills
  skills: string[];
  bio: string;
  // Agreements
  agreements: {
    type: "CODE_OF_CONDUCT" | "SAFEGUARDING";
    signatureData: string;
  }[];
};

export type ProfileUpdateData = Partial<
  Pick<
    ApplicationFormData,
    | "phone"
    | "address"
    | "emergencyContactName"
    | "emergencyContactPhone"
    | "emergencyContactRelationship"
    | "bio"
    | "skills"
    | "availability"
  >
>;

// ─── Service Areas ──────────────────────────────────────

export async function listServiceAreas() {
  const db = getDb();
  return db.serviceArea.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
  });
}

// ─── Application ────────────────────────────────────────

export async function getApplicationStatusForUser(userId: string) {
  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
    include: {
      applications: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!profile) return null;

  return {
    profileStatus: profile.status,
    applicationStatus: profile.applications[0]?.status ?? null,
    applicationNotes: profile.applications[0]?.notes ?? null,
    submittedAt: profile.applications[0]?.submittedAt ?? null,
  };
}

export async function submitApplicationAsUser(
  userId: string,
  data: ApplicationFormData
): Promise<MutationResult> {
  const db = getDb();

  // Check for existing profile
  const existing = await db.volunteerProfile.findUnique({
    where: { userId },
  });
  if (existing) {
    return { error: "You have already submitted an application." };
  }

  try {
    await db.$transaction(async (tx) => {
      // Create volunteer profile
      const profile = await tx.volunteerProfile.create({
        data: {
          userId,
          phone: data.phone,
          address: data.address,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelationship: data.emergencyContactRelationship,
          availability: data.availability,
          skills: data.skills,
          bio: data.bio,
          status: "APPLICATION_SUBMITTED",
          interests: {
            connect: data.serviceAreaIds.map((id) => ({ id })),
          },
        },
      });

      // Create application record
      await tx.application.create({
        data: {
          volunteerId: profile.id,
          status: "PENDING",
        },
      });

      // Create signed agreements. The version is read from the template rather
      // than hardcoded - otherwise an applicant signing today against a v2.0
      // Code of Conduct is filed as v1.0 and shows up as outdated on arrival.
      const templates = await tx.agreementTemplate.findMany({
        where: { agreementType: { in: data.agreements.map((a) => a.type) } },
        select: { agreementType: true, version: true },
      });

      for (const agreement of data.agreements) {
        await tx.signedAgreement.create({
          data: {
            volunteerId: profile.id,
            agreementType: agreement.type,
            signatureData: agreement.signatureData,
            documentVersion:
              templates.find((t) => t.agreementType === agreement.type)
                ?.version ?? "1.0",
          },
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/application");
    return { success: true };
  } catch (e) {
    console.error("Application submission error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Profile ────────────────────────────────────────────

export async function getProfileForUser(userId: string) {
  const db = getDb();
  return db.volunteerProfile.findUnique({
    where: { userId },
    include: {
      interests: true,
      applications: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
      signedAgreements: true,
    },
  });
}

export async function updateProfileAsUser(
  userId: string,
  data: ProfileUpdateData
): Promise<MutationResult> {
  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
  });
  if (!profile) {
    return { error: "No profile found." };
  }

  try {
    await db.volunteerProfile.update({
      where: { id: profile.id },
      data: {
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.emergencyContactName !== undefined && {
          emergencyContactName: data.emergencyContactName,
        }),
        ...(data.emergencyContactPhone !== undefined && {
          emergencyContactPhone: data.emergencyContactPhone,
        }),
        ...(data.emergencyContactRelationship !== undefined && {
          emergencyContactRelationship: data.emergencyContactRelationship,
        }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.skills !== undefined && { skills: data.skills }),
        ...(data.availability !== undefined && {
          availability: data.availability,
        }),
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (e) {
    console.error("Profile update error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}
