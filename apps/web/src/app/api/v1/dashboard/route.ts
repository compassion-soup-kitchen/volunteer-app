import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { emptyDashboard, serializeDashboard } from "@/lib/api/serializers";
import { getDashboardDataForUser } from "@/lib/data/volunteer-dashboard";

export const GET = withApiAuth(async (_req, user) => {
  const data = await getDashboardDataForUser(user.id);
  return NextResponse.json(data ? serializeDashboard(data) : emptyDashboard());
});
