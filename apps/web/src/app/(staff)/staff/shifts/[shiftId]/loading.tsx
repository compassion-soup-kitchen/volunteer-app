import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  TextCardSkeleton,
} from "@/components/brand/page-skeleton";

export default function ShiftDetailLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <TextCardSkeleton lines={5} />
        </div>
        <ListCardSkeleton title rows={5} trailing className="lg:col-span-2" />
      </div>
    </PageSkeleton>
  );
}
