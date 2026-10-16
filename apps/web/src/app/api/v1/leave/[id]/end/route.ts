import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { endLeave } from "@/lib/data/leave";

type Ctx = { params: Promise<{ id: string }> };

/** Back early: leave under way ends yesterday. */
export const POST = withApiAuth<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json(
    await endLeave({ actor: { kind: "self", userId: user.id }, leaveId: id })
  );
});
