import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { emptyHours, serializeHours } from "@/lib/api/serializers";
import { getVolunteerHoursDataForUser } from "@/lib/data/volunteer-dashboard";

export const GET = withApiAuth(async (_req, user) => {
  const data = await getVolunteerHoursDataForUser(user.id);
  return NextResponse.json(data ? serializeHours(data) : emptyHours());
});
