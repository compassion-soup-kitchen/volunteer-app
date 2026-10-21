import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  PageSkeleton,
  TextCardSkeleton,
} from "@/components/brand/page-skeleton";

/** A bordered-header card holding a form: a few fields, then the save row. */
function SettingsCardSkeleton({ fields }: { fields: number }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex justify-end border-t border-border pt-5">
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffAccountLoading() {
  return (
    <PageSkeleton className="max-w-3xl space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </CardContent>
      </Card>
      <SettingsCardSkeleton fields={2} />
      <SettingsCardSkeleton fields={3} />
      <TextCardSkeleton lines={2} />
    </PageSkeleton>
  );
}
