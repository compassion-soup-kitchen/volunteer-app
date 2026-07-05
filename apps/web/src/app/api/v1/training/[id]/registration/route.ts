import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import {
  cancelTrainingRegistrationAsUser,
  registerForTrainingAsUser,
} from "@/lib/data/volunteer-training";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiAuth<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json(await registerForTrainingAsUser(user.id, id));
});

export const DELETE = withApiAuth<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  return NextResponse.json(await cancelTrainingRegistrationAsUser(user.id, id));
});
