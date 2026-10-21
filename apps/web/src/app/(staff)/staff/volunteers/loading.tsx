import { Skeleton } from "@/components/ui/skeleton";
import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/brand/page-skeleton";

export default function VolunteersLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton actions={1} />
      <div className="space-y-4">
        {/* Search on its own row until 2xl, then the filters and the count */}
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
          <Skeleton className="h-10 w-full 2xl:max-w-xs" />
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-10 w-full sm:w-52" />
            <Skeleton className="h-10 w-full sm:w-44" />
            <Skeleton className="h-10 w-full sm:w-44" />
            <Skeleton className="h-6 w-24 shrink-0 rounded-full sm:ml-auto" />
          </div>
        </div>
        <ListCardSkeleton rows={8} trailing />
      </div>
    </PageSkeleton>
  );
}
