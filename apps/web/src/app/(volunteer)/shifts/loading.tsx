import {
  BlockSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
  TextLine,
} from "@/components/brand/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShiftsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back />

      <div className="space-y-8">
        <div className="space-y-4">
          {/* Week pager */}
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1">
              <Skeleton className="size-9" />
              <Skeleton className="size-9" />
            </div>
            <div className="min-w-0">
              <TextLine className="font-serif text-xl/tight" bar="w-32" />
              <TextLine className="text-sm" bar="w-28" />
            </div>
          </div>
          {/* Day strip */}
          <div className="grid grid-cols-7 gap-1.5 sm:max-w-lg">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          {/* Area filter */}
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
            ))}
          </div>
        </div>

        {Array.from({ length: 2 }, (_, i) => (
          <section key={i} className="space-y-3">
            <SectionHeaderSkeleton />
            <BlockSkeleton className="h-24" />
          </section>
        ))}
      </div>
    </PageSkeleton>
  );
}
