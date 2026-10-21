import {
  ActionBarSkeleton,
  ListCardSkeleton,
  SectionHeaderSkeleton,
} from "@/components/brand/page-skeleton";

/** The pānui list while it loads: shared by the page's Suspense and loading.tsx. */
export function AnnouncementsSkeleton() {
  return (
    <div className="space-y-6">
      <ActionBarSkeleton />
      <section className="space-y-4">
        <SectionHeaderSkeleton />
        <ListCardSkeleton rows={4} trailing />
      </section>
    </div>
  );
}
