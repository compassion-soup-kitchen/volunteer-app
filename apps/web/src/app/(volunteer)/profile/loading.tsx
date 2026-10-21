import {
  ListCardSkeleton,
  PageSkeleton,
  TextLine,
} from "@/components/brand/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <PageSkeleton className="pb-24">
      {/* PageHeader with the avatar in its title, status and edit on the right */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-1 hidden size-9 shrink-0 sm:block" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <Skeleton className="h-7 w-48 sm:h-8" />
            </div>
            <TextLine className="text-sm sm:text-base" bar="w-56" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-6">
          <ListCardSkeleton title rows={4} />
          <ListCardSkeleton title rows={3} />
          <ListCardSkeleton title rows={2} trailing />
          <ListCardSkeleton title rows={2} trailing />
        </div>
        <div className="min-w-0 space-y-6">
          <ListCardSkeleton title rows={1} />
          <ListCardSkeleton title rows={3} />
          <ListCardSkeleton title rows={1} />
          <ListCardSkeleton title rows={2} />
        </div>
      </div>
    </PageSkeleton>
  );
}
