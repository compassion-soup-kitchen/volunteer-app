import {
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/brand/page-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <PageSkeleton className="pb-24">
      <PageHeaderSkeleton back />
      <div className="space-y-5">
        {[2, 4, 2].map((members, i) => (
          <Card key={i} className="gap-0 pb-2">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="border-t border-border pt-4 pb-2">
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: members }, (_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="size-9 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageSkeleton>
  );
}
