import { PageHeaderSkeleton, PageSkeleton } from "@/components/brand/page-skeleton";
import { TrainingFormSkeleton } from "./skeleton";

export default function NewTrainingLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back description={false} />
      <TrainingFormSkeleton />
    </PageSkeleton>
  );
}
