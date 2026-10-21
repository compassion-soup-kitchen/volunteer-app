import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockSkeleton } from "@/components/brand/page-skeleton";

/** The month grid and its side panel: shared by the page's Suspense and loading.tsx. */
export function CalendarSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="p-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-[28rem] w-full" />
      </Card>
      <div className="space-y-6">
        <BlockSkeleton className="h-56" />
        <BlockSkeleton className="h-72" />
      </div>
    </div>
  );
}
