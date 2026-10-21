import { PageHeaderSkeleton, PageSkeleton } from "@/components/brand/page-skeleton";
import { TrainingListSkeleton } from "./skeleton";

export default function StaffTrainingLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton actions={2} />
      <TrainingListSkeleton />
    </PageSkeleton>
  );
}
