"use server";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

export type ApplicationResult = {
  error?: string;
  success?: boolean;
};

export async function getServiceAreas() {
  const db = getDb();
  return db.serviceArea.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
  });
}

export async function getUserApplicationStatus() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
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
  };
}

export async function submitApplication(
  data: ApplicationFormData
): Promise<ApplicationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to apply." };
  }

  const db = getDb();

  // Check for existing profile
  const existing = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    return { error: "You have already submitted an application." };
  }

  try {
    await db.$transaction(async (tx) => {
      // Create volunteer profile
      const profile = await tx.volunteerProfile.create({
        data: {
          userId: session.user!.id,
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

      // Create signed agreements
      for (const agreement of data.agreements) {
        await tx.signedAgreement.create({
          data: {
            volunteerId: profile.id,
            agreementType: agreement.type,
            signatureData: agreement.signatureData,
            documentVersion: "1.0",
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

export async function getVolunteerProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  return db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
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

export async function updateVolunteerProfile(
  data: Partial<
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
  >
): Promise<ApplicationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const db = getDb();
  const profile = await db.volunteerProfile.findUnique({
    where: { userId: session.user.id },
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
