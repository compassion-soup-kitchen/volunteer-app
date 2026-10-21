import {
  PageHeaderSkeleton,
  PageSkeleton,
  TextCardSkeleton,
} from "@/components/brand/page-skeleton";

export default function NewsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {Array.from({ length: 4 }, (_, i) => (
          <TextCardSkeleton key={i} lines={5} />
        ))}
      </div>
    </PageSkeleton>
  );
}
