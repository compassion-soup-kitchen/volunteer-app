import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeEvent } from "@/lib/api/serializers";
import { getEventForUser } from "@/lib/data/events";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiAuth<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const event = await getEventForUser(id, user.id, user.role);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  return NextResponse.json(serializeEvent(event));
});
