"use server";

import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export type AnnouncementSummary = {
  id: string;
  title: string;
  body: string;
  sentAt: Date;
  authorName: string | null;
};

export async function getRecentAnnouncements(
  limit = 3
): Promise<AnnouncementSummary[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  const db = getDb();

  const announcements = await db.announcement.findMany({
    where: {
      sentAt: { not: null },
      audience: { in: ["ALL", "VOLUNTEERS"] },
    },
    orderBy: { sentAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      body: true,
      sentAt: true,
      createdBy: { select: { name: true } },
    },
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    sentAt: a.sentAt!,
    authorName: a.createdBy?.name ?? null,
  }));
}

export async function getAnnouncements(): Promise<AnnouncementSummary[]> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return [];

  const db = getDb();

  const announcements = await db.announcement.findMany({
    where: {
      sentAt: { not: null },
      audience: { in: ["ALL", "VOLUNTEERS"] },
    },
    orderBy: { sentAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      sentAt: true,
      createdBy: { select: { name: true } },
    },
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    sentAt: a.sentAt!,
    authorName: a.createdBy?.name ?? null,
  }));
}
