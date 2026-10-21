import {
  ActionBarSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
  TextCardSkeleton,
} from "@/components/brand/page-skeleton";

export default function GroupsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <ActionBarSkeleton />
      <section className="space-y-4">
        <SectionHeaderSkeleton eyebrow={false} />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <TextCardSkeleton key={i} title={false} lines={4} />
          ))}
        </div>
      </section>
    </PageSkeleton>
  );
}
