import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import {
  cancelShiftSignupAsUser,
  signUpForShiftAsUser,
} from "@/lib/data/volunteer-shifts";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiAuth<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json(await signUpForShiftAsUser(user.id, id));
});

export const DELETE = withApiAuth<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json(await cancelShiftSignupAsUser(user.id, id));
});
