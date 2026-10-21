import {
  FormCardSkeleton,
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/brand/page-skeleton";

export default function LeaveLoading() {
  return (
    <PageSkeleton className="pb-24">
      <PageHeaderSkeleton back />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-6">
          <FormCardSkeleton fields={4} />
          <ListCardSkeleton title rows={1} />
        </div>
        <ListCardSkeleton title rows={1} />
      </div>
    </PageSkeleton>
  );
}
