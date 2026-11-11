"use server";

import { after } from "next/server";
import { requireActiveSession } from "@/lib/action-auth";
import { checkApplicationSubmission } from "@/lib/application-submission";
import {
  getApplicationStatusForUser,
  getProfileForUser,
  listServiceAreas,
  submitApplicationAsUser,
  updateProfileAsUser,
  type ApplicationFormData,
  type ProfileUpdateData,
} from "@/lib/data/volunteer-profile";
import {
  sendEmail,
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  getBaseUrl,
} from "@/lib/email";
import { applicationReceivedEmail } from "@/lib/email-templates";

export type { ApplicationFormData } from "@/lib/data/volunteer-profile";

export type ApplicationResult = {
  error?: string;
  success?: boolean;
};

export async function getServiceAreas() {
  return listServiceAreas();
}

export async function getUserApplicationStatus() {
  const session = await requireActiveSession();
  if (!session?.user?.id) return null;

  const status = await getApplicationStatusForUser(session.user.id);
  if (!status) return null;

  return {
    profileStatus: status.profileStatus,
    applicationStatus: status.applicationStatus,
    applicantMessage: status.applicantMessage,
  };
}

export async function submitApplication(
  data: ApplicationFormData
): Promise<ApplicationResult> {
  const session = await requireActiveSession();
  if (!session?.user?.id) {
    return { error: "You must be signed in to apply." };
  }

  const checked = checkApplicationSubmission(data);
  if (!checked.ok) return { error: checked.error };

  const result = await submitApplicationAsUser(session.user.id, checked.data);

  if (result.success && session.user.email) {
    const { subject, content } = applicationReceivedEmail(
      session.user.name ?? null,
      `${getBaseUrl()}/application`
    );
    after(() =>
      sendEmail({
        to: session.user.email!,
        subject,
        html: buildBrandedEmailHtml(content),
        text: buildBrandedEmailText(content),
      })
    );
  }

  return result;
}

export async function getVolunteerProfile() {
  const session = await requireActiveSession();
  if (!session?.user?.id) return null;

  return getProfileForUser(session.user.id);
}

export async function updateVolunteerProfile(
  data: ProfileUpdateData
): Promise<ApplicationResult> {
  const session = await requireActiveSession();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  return updateProfileAsUser(session.user.id, data);
}
