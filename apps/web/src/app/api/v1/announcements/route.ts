import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeAnnouncement } from "@/lib/api/serializers";
import { listVolunteerAnnouncements } from "@/lib/data/announcements";

export const GET = withApiAuth(async () => {
  const announcements = await listVolunteerAnnouncements();
  return NextResponse.json(announcements.map(serializeAnnouncement));
});
