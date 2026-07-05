import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeSessionUser } from "@/lib/api/serializers";

export const GET = withApiAuth(async (_req, user) => {
  return NextResponse.json({ user: serializeSessionUser(user) });
});
