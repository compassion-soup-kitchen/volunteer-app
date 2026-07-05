import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeTrainingSession } from "@/lib/api/serializers";
import { getTrainingSessionForUser } from "@/lib/data/volunteer-training";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiAuth<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const session = await getTrainingSessionForUser(user.id, id);
  if (!session) {
    return NextResponse.json(
      { error: "Training session not found." },
      { status: 404 }
    );
  }
  return NextResponse.json(serializeTrainingSession(session));
});
