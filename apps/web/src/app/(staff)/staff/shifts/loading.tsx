import { PageHeaderSkeleton, PageSkeleton } from "@/components/brand/page-skeleton";
import { ShiftWeekSkeleton } from "./skeleton";

export default function StaffShiftsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton actions={2} />
      <ShiftWeekSkeleton />
    </PageSkeleton>
  );
}
