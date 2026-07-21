import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaffAnnouncements } from "@/lib/announcement-actions";
import { AnnouncementManager } from "./announcement-manager";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Announcements | Te Pūaroha Staff",
};

function AnnouncementsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

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
