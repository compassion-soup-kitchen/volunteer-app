import {
  ActionBarSkeleton,
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
} from "@/components/brand/page-skeleton";

export default function TrainingTypesLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back />
      <ActionBarSkeleton />
      <section className="space-y-4">
        <SectionHeaderSkeleton />
        <ListCardSkeleton rows={4} trailing />
      </section>
    </PageSkeleton>
  );
}
