import { PageHeaderSkeleton, PageSkeleton } from "@/components/brand/page-skeleton";
import { ReportsSkeleton } from "./skeleton";

export default function StaffReportsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <ReportsSkeleton />
    </PageSkeleton>
  );
}
