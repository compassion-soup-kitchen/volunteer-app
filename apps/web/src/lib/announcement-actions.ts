"use server";

import { connection } from "next/server";
import { auth } from "@/lib/auth";
import {
  listVolunteerAnnouncements,
  type AnnouncementSummary,
} from "@/lib/data/announcements";

export type { AnnouncementSummary } from "@/lib/data/announcements";

export async function getRecentAnnouncements(
  limit = 3
): Promise<AnnouncementSummary[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  return listVolunteerAnnouncements(limit);
}

export async function getAnnouncements(): Promise<AnnouncementSummary[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  return listVolunteerAnnouncements();
}
