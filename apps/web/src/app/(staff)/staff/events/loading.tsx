import { PageHeaderSkeleton, PageSkeleton } from "@/components/brand/page-skeleton";
import { EventsSkeleton } from "./skeleton";

export default function StaffEventsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <EventsSkeleton />
    </PageSkeleton>
  );
}
