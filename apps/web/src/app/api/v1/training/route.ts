import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeTrainingSession } from "@/lib/api/serializers";
import { getAvailableTrainingForUser } from "@/lib/data/volunteer-training";

export const GET = withApiAuth(async (_req, user) => {
  const sessions = await getAvailableTrainingForUser(user.id);
  return NextResponse.json(sessions.map(serializeTrainingSession));
});
