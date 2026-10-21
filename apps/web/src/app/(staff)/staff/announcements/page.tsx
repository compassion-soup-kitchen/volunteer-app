import type { Metadata } from "next";
import { Suspense } from "react";
import { getStaffAnnouncements } from "@/lib/announcement-actions";
import { AnnouncementManager } from "./announcement-manager";
import { PageHeader } from "@/components/brand/page-header";
import { AnnouncementsSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Announcements | Te Pūaroha Staff",
};

async function AnnouncementsContent() {
  const announcements = await getStaffAnnouncements();
  return <AnnouncementManager initialAnnouncements={announcements} />;
}

export default function StaffAnnouncementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ngā pānui · Announcements"
        title="Announcements"
        description="Share news and updates with the whānau"
      />
      <Suspense fallback={<AnnouncementsSkeleton />}>
        <AnnouncementsContent />
      </Suspense>
    </div>
  );
}
