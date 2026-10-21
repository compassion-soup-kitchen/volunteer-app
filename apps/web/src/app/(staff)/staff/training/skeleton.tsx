import {
  ListCardSkeleton,
  SectionHeaderSkeleton,
} from "@/components/brand/page-skeleton";

/** The session list while it loads: shared by the page's Suspense and loading.tsx. */
export function TrainingListSkeleton() {
  return (
    <section className="space-y-4">
      <SectionHeaderSkeleton />
      <ListCardSkeleton rows={4} trailing />
    </section>
  );
}
