import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeAnnouncement } from "@/lib/api/serializers";
import { getVolunteerAnnouncement } from "@/lib/data/announcements";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiAuth<Ctx>(async (_req, _user, ctx) => {
  const { id } = await ctx.params;
  const announcement = await getVolunteerAnnouncement(id);
  if (!announcement) {
    return NextResponse.json(
      { error: "Announcement not found." },
      { status: 404 }
    );
  }
  return NextResponse.json(serializeAnnouncement(announcement));
});
