import {
  ActionBarSkeleton,
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
} from "@/components/brand/page-skeleton";

export default function ServiceAreasLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <ActionBarSkeleton />
      <section className="space-y-4">
        <SectionHeaderSkeleton eyebrow={false} />
        <ListCardSkeleton rows={5} trailing />
      </section>
    </PageSkeleton>
  );
}
