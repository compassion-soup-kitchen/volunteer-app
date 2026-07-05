"use server";

import { auth } from "@/lib/auth";
import {
  getApplicationStatusForUser,
  getProfileForUser,
  listServiceAreas,
  submitApplicationAsUser,
  updateProfileAsUser,
  type ApplicationFormData,
  type ProfileUpdateData,
} from "@/lib/data/volunteer-profile";

export type { ApplicationFormData } from "@/lib/data/volunteer-profile";

export type ApplicationResult = {
  error?: string;
  success?: boolean;
};

export async function getServiceAreas() {
  return listServiceAreas();
}

export async function getUserApplicationStatus() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const status = await getApplicationStatusForUser(session.user.id);
  if (!status) return null;

  return {
    profileStatus: status.profileStatus,
    applicationStatus: status.applicationStatus,
    applicationNotes: status.applicationNotes,
  };
}

export async function submitApplication(
  data: ApplicationFormData
): Promise<ApplicationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to apply." };
  }

  return submitApplicationAsUser(session.user.id, data);
}

export async function getVolunteerProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return getProfileForUser(session.user.id);
}

export async function updateVolunteerProfile(
  data: ProfileUpdateData
): Promise<ApplicationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  return updateProfileAsUser(session.user.id, data);
}
