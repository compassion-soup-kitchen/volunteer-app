import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  TextCardSkeleton,
} from "@/components/brand/page-skeleton";

export default function TrainingDetailLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back description={false} />
      <div className="grid gap-6 lg:grid-cols-3">
        <TextCardSkeleton lines={5} className="lg:col-span-1" />
        <ListCardSkeleton title rows={5} trailing className="lg:col-span-2" />
      </div>
    </PageSkeleton>
  );
}
