import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListCardSkeleton, StatTilesSkeleton } from "@/components/brand/page-skeleton";

/** Filters, figures and charts: shared by the page's Suspense and loading.tsx. */
export function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="w-full space-y-1.5 sm:w-44">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-32 rounded-lg" />
        </CardContent>
      </Card>
      <StatTilesSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListCardSkeleton title rows={4} />
        <ListCardSkeleton title rows={2} />
      </div>
    </div>
  );
}
