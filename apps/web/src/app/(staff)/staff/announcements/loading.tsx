import { PageHeaderSkeleton, PageSkeleton } from "@/components/brand/page-skeleton";
import { AnnouncementsSkeleton } from "./skeleton";

export default function StaffAnnouncementsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <AnnouncementsSkeleton />
    </PageSkeleton>
  );
}
