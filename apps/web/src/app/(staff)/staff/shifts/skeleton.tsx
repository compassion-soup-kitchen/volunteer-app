import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** The roster week while it loads: shared by the page's Suspense and loading.tsx. */
export function ShiftWeekSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-12 w-64 max-w-full" />
        <Skeleton className="h-9 w-80 max-w-full" />
      </div>
      <Card className="gap-0 py-0">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-4 border-b border-border px-5 py-4 last:border-0">
            <Skeleton className="h-14 w-11" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
