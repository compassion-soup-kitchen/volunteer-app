import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeShift } from "@/lib/api/serializers";
import { getAvailableShiftsForUser } from "@/lib/data/volunteer-shifts";

export const GET = withApiAuth(async (req, user) => {
  const serviceAreaId =
    req.nextUrl.searchParams.get("serviceAreaId") ?? undefined;

  const shifts = await getAvailableShiftsForUser(user.id, { serviceAreaId });
  return NextResponse.json(shifts.map(serializeShift));
});
