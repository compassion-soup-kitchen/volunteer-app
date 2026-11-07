import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeShiftWeek } from "@/lib/api/serializers";
import { isDateOnly } from "@/lib/date-only";
import { getShiftWeekForUser } from "@/lib/data/volunteer-shifts";

/**
 * `GET /api/v1/shifts/week?from=YYYY-MM-DD&serviceAreaId=…`
 *
 * One week of open shifts plus the Monday of the next week that has any, so
 * the app can page through the roster as the volunteer scrolls. Leave `from`
 * off for the first page (this week, or the first week after it with
 * anything on); pass the previous page's `nextWeek` for the one after.
 *
 * `GET /api/v1/shifts` still returns every upcoming shift for app builds
 * that predate this route.
 */
export const GET = withApiAuth(async (req, user) => {
  const params = req.nextUrl.searchParams;
  const from = params.get("from") ?? undefined;
  if (from !== undefined && !isDateOnly(from)) {
    return NextResponse.json(
      { error: "`from` must be a calendar day (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  const page = await getShiftWeekForUser(user.id, {
    from,
    serviceAreaId: params.get("serviceAreaId") ?? undefined,
  });
  return NextResponse.json(serializeShiftWeek(page));
});
