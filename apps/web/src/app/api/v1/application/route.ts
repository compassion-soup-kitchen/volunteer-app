import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiAuth } from "@/lib/api/auth";
import {
  getApplicationStatusForUser,
  submitApplicationAsUser,
} from "@/lib/data/volunteer-profile";

/** The signed-in user's latest application, or `null` before they apply. */
export const GET = withApiAuth(async (_req, user) => {
  const status = await getApplicationStatusForUser(user.id);
  if (!status?.applicationStatus || !status.submittedAt) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    status: status.applicationStatus,
    submittedAt: status.submittedAt.toISOString(),
    notes: status.applicationNotes,
  });
});

const submissionSchema = z.object({
  phone: z.string().trim().min(1, "Please add a phone number."),
  address: z.string().trim().min(1, "Please add your address."),
  dateOfBirth: z.string(),
  emergencyContactName: z.string().trim().min(1, "Please complete your emergency contact."),
  emergencyContactPhone: z.string().trim().min(1, "Please complete your emergency contact."),
  emergencyContactRelationship: z.string().trim().min(1, "Please complete your emergency contact."),
  availability: z.record(z.string(), z.array(z.string())),
  serviceAreaIds: z.array(z.string()).min(1, "Please choose at least one area of mahi."),
  skills: z.array(z.string()),
  bio: z.string(),
  agreements: z.array(
    z.object({
      type: z.enum(["CODE_OF_CONDUCT", "SAFEGUARDING"]),
      signatureData: z.string().trim().min(1),
    })
  ),
});

export const POST = withApiAuth(async (req, user) => {
  const body = await req.json().catch(() => null);
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (
    Object.values(data.availability).every((slots) => !slots || slots.length === 0)
  ) {
    return NextResponse.json(
      { error: "Please pick at least one time you are available." },
      { status: 400 }
    );
  }

  const signedTypes = new Set(data.agreements.map((a) => a.type));
  if (!signedTypes.has("CODE_OF_CONDUCT") || !signedTypes.has("SAFEGUARDING")) {
    return NextResponse.json(
      { error: "Please sign both agreements." },
      { status: 400 }
    );
  }

  return NextResponse.json(await submitApplicationAsUser(user.id, data));
});
