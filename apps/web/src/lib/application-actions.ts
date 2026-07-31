"use server";

import { after } from "next/server";
import { z } from "zod";
import { requireActiveSession } from "@/lib/action-auth";
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

// Server-side guardrail on top of the form's own step validation: enforce
// shapes, enums, and sane length caps without being stricter than the form.
const applicationSchema = z.object({
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(1).max(300),
  dateOfBirth: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date of birth"),
  emergencyContactName: z.string().trim().min(1).max(120),
  emergencyContactPhone: z.string().trim().min(6).max(30),
  emergencyContactRelationship: z.string().trim().min(1).max(60),
  availability: z.record(z.string(), z.array(z.string().max(30)).max(10)),
  serviceAreaIds: z.array(z.string().max(40)).max(30),
  skills: z.array(z.string().max(120)).max(50),
  bio: z.string().max(3000),
  agreements: z.array(
    z.object({
      type: z.enum(["CODE_OF_CONDUCT", "SAFEGUARDING"]),
      signatureData: z.string().min(1).max(500_000),
    })
  ),
});

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
    applicationNotes: status.applicationNotes,
  };
}

export async function submitApplication(
  data: ApplicationFormData
): Promise<ApplicationResult> {
  const session = await requireActiveSession();
  if (!session?.user?.id) {
    return { error: "You must be signed in to apply." };
  }

  const parsed = applicationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Please check your application details and try again." };
  }

  const result = await submitApplicationAsUser(session.user.id, parsed.data);

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
