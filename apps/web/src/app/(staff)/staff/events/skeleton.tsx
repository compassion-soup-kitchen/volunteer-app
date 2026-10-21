import {
  ActionBarSkeleton,
  ListCardSkeleton,
  SectionHeaderSkeleton,
} from "@/components/brand/page-skeleton";

/** The events list while it loads: shared by the page's Suspense and loading.tsx. */
export function EventsSkeleton() {
  return (
    <div className="space-y-6">
      <ActionBarSkeleton />
      <section className="space-y-4">
        <SectionHeaderSkeleton />
        <ListCardSkeleton rows={3} trailing />
      </section>
    </div>
  );
}
