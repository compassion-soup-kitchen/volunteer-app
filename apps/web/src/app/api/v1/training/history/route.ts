import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeTrainingHistoryItem } from "@/lib/api/serializers";
import { getTrainingHistoryForUser } from "@/lib/data/volunteer-training";

export const GET = withApiAuth(async (_req, user) => {
  const history = await getTrainingHistoryForUser(user.id);
  return NextResponse.json(history.map(serializeTrainingHistoryItem));
});
