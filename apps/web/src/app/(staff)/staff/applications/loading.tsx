import { Skeleton } from "@/components/ui/skeleton";
import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/brand/page-skeleton";

export default function ApplicationsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <div className="space-y-4">
        {/* Search, status tabs and the count badge */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Skeleton className="h-10 w-full lg:max-w-xs" />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="h-9 w-full max-w-md rounded-lg" />
            <Skeleton className="ml-auto h-6 w-28 shrink-0 rounded-full" />
          </div>
        </div>
        <ListCardSkeleton rows={6} trailing />
      </div>
    </PageSkeleton>
  );
}
