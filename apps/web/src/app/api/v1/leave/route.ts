import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeLeaveOverview } from "@/lib/api/serializers";
import { getPersonLeave, saveLeave } from "@/lib/data/leave";
import { todayInAppZone } from "@/lib/date-only";
import { readLeaveBody } from "@/lib/api/leave-body";

/**
 * Their own leave: under way, coming up, and the last few past. Volunteers and
 * the kitchen team both keep it; anyone else gets `canLog: false`.
 */
export const GET = withApiAuth(async (_req, user) => {
  const overview = await getPersonLeave(user.id);
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
      actor: { kind: "self", userId: user.id },
      data: { startsOn: body.startsOn, endsOn: body.endsOn, reason: body.reason },
    })
  );
});
