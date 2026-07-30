import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeEvent } from "@/lib/api/serializers";
import {
  listPastEventsForUser,
  listUpcomingEventsForUser,
} from "@/lib/data/events";

/**
 * Events this person is invited to, split the way the app shows them.
 * `?past=1` asks for the ones that have already happened.
 */
export const GET = withApiAuth(async (req, user) => {
  const wantsPast = new URL(req.url).searchParams.get("past") === "1";

  const events = wantsPast
    ? await listPastEventsForUser(user.id, user.role, { limit: 12 })
    : await listUpcomingEventsForUser(user.id, user.role);

  return NextResponse.json(events.map(serializeEvent));
});
