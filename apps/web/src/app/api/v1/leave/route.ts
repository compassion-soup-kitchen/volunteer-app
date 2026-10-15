import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeLeaveOverview } from "@/lib/api/serializers";
import {
  getLeaveOverview,
  saveLeave,
  volunteerIdForUser,
} from "@/lib/data/volunteer-leave";
import { todayInAppZone } from "@/lib/date-only";
import { readLeaveBody } from "@/lib/api/leave-body";

/** The volunteer's own leave: under way, coming up, and the last few past. */
export const GET = withApiAuth(async (_req, user) => {
  const volunteerId = await volunteerIdForUser(user.id);
  const overview = volunteerId ? await getLeaveOverview(volunteerId) : null;
  return NextResponse.json(serializeLeaveOverview(overview, todayInAppZone()));
});

/** `{ startsOn, endsOn, reason? }` - logs new leave and clears the roster. */
export const POST = withApiAuth(async (req, user) => {
  const body = await readLeaveBody(req);
  if (!body) {
    return NextResponse.json({ error: "Choose the days you're away." }, { status: 400 });
  }
  // Errors come back as a body, matching the shift and event endpoints.
  return NextResponse.json(
    await saveLeave({
      actor: { kind: "volunteer", userId: user.id },
      data: { startsOn: body.startsOn, endsOn: body.endsOn, reason: body.reason },
    })
  );
});
