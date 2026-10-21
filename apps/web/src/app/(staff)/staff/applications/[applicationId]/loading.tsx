import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  TextCardSkeleton,
} from "@/components/brand/page-skeleton";

export default function ApplicationReviewLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ListCardSkeleton title rows={4} />
          <ListCardSkeleton title rows={3} />
          <TextCardSkeleton lines={3} />
          <ListCardSkeleton title rows={2} />
        </div>
        <div className="space-y-4">
          <TextCardSkeleton lines={2} />
          <TextCardSkeleton lines={1} />
          <TextCardSkeleton lines={3} />
        </div>
      </div>
    </PageSkeleton>
  );
}
