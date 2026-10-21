import { PageHeaderSkeleton, PageSkeleton } from "@/components/brand/page-skeleton";
import { CalendarSkeleton } from "./skeleton";

export default function StaffCalendarLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <CalendarSkeleton />
    </PageSkeleton>
  );
}
