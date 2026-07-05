import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeScheduleEntry } from "@/lib/api/serializers";
import { getScheduleForUser } from "@/lib/data/volunteer-shifts";

export const GET = withApiAuth(async (_req, user) => {
  const schedule = await getScheduleForUser(user.id);
  return NextResponse.json({
    upcoming: schedule.upcoming.map(serializeScheduleEntry),
    past: schedule.past.map(serializeScheduleEntry),
  });
});
