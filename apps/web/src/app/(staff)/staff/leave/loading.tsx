import { PageHeaderSkeleton, PageSkeleton } from "@/components/brand/page-skeleton";
import { BoardSkeleton } from "./skeleton";

export default function StaffLeaveLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <BoardSkeleton />
    </PageSkeleton>
  );
}
