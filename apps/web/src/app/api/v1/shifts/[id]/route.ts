import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeShift } from "@/lib/api/serializers";
import { getShiftForUser } from "@/lib/data/volunteer-shifts";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiAuth<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const shift = await getShiftForUser(user.id, id);
  if (!shift) {
    return NextResponse.json({ error: "Shift not found." }, { status: 404 });
  }
  return NextResponse.json(serializeShift(shift));
});
