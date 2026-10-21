import {
  PageHeaderSkeleton,
  PageSkeleton,
  TextLine,
} from "@/components/brand/page-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i}>
            <CardHeader>
              <TextLine className="eyebrow" bar="w-28" />
              <TextLine className="font-serif text-lg" bar="w-56" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/5" />
              {/* Reply buttons */}
              <div className="flex flex-wrap gap-2 pt-3">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageSkeleton>
  );
}
