import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiAuth } from "@/lib/api/auth";
import { serializeProfile } from "@/lib/api/serializers";
import {
  getProfileForUser,
  updateProfileAsUser,
} from "@/lib/data/volunteer-profile";
import { getTrainingHistoryForUser } from "@/lib/data/volunteer-training";

export const GET = withApiAuth(async (_req, user) => {
  const profile = await getProfileForUser(user.id);
  if (!profile) {
    return NextResponse.json(
      { error: "No volunteer profile yet." },
      { status: 404 }
    );
  }

  const trainingHistory = await getTrainingHistoryForUser(user.id);
  return NextResponse.json(serializeProfile(profile, user, trainingHistory));
});

const updateSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  skills: z.array(z.string()).optional(),
  availability: z.record(z.string(), z.array(z.string())).optional(),
});

export const PATCH = withApiAuth(async (req, user) => {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile update." },
      { status: 400 }
    );
  }

  return NextResponse.json(await updateProfileAsUser(user.id, parsed.data));
});
