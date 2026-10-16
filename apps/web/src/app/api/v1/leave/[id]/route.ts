import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { deleteLeave, saveLeave } from "@/lib/data/leave";
import { readLeaveBody } from "@/lib/api/leave-body";

type Ctx = { params: Promise<{ id: string }> };

/** `{ startsOn, endsOn, reason? }` - changes leave already logged. */
export const PATCH = withApiAuth<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const body = await readLeaveBody(req);
  if (!body) {
    return NextResponse.json({ error: "Choose the days you're away." }, { status: 400 });
  }
  return NextResponse.json(
    await saveLeave({
      actor: { kind: "self", userId: user.id },
      leaveId: id,
      data: { startsOn: body.startsOn, endsOn: body.endsOn, reason: body.reason },
    })
  );
});

/** Cancels leave that hasn't started yet. */
export const DELETE = withApiAuth<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json(
    await deleteLeave({ actor: { kind: "self", userId: user.id }, leaveId: id })
  );
});
