import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeAnnouncement } from "@/lib/api/serializers";
import { listVolunteerAnnouncements } from "@/lib/data/announcements";

export const GET = withApiAuth(async (_req, user) => {
  const announcements = await listVolunteerAnnouncements({
    reader: { userId: user.id, role: user.role },
  });
  return NextResponse.json(announcements.map(serializeAnnouncement));
});
